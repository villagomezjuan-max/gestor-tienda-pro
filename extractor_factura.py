import streamlit as st
from google import genai
from google.genai import types
import json
import pandas as pd

# --- Configuración de Constantes ---
DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-2.0-flash"]

# --- Configuración de la Página ---
st.set_page_config(
    page_title="Extractor de Facturas",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# --- Funciones Auxiliares ---

def clean_json_string(json_str):
    """Limpia la respuesta de la IA para obtener solo el JSON."""
    # Remover marcadores de código
    json_str = json_str.replace("```json", "").replace("```", "").strip()
    
    # Buscar el inicio y fin del JSON si hay texto adicional
    start_idx = json_str.find('{')
    end_idx = json_str.rfind('}')
    
    if start_idx != -1 and end_idx != -1:
        json_str = json_str[start_idx:end_idx+1]
    
    return json_str

def validate_invoice_data(data):
    """Valida la coherencia matemática de la factura extraída."""
    results = {
        "is_valid": True,
        "errors": [],
        "warnings": [],
        "details": {}
    }
    
    try:
        # Obtener valores (asegurando que sean float)
        def get_float(val):
            if isinstance(val, (int, float)):
                return float(val)
            if isinstance(val, str) and val.strip():
                return float(val.replace(',', '').replace('$', ''))
            return 0.0

        # 1. Validar Suma de Productos vs Subtotal
        productos = data.get('productos', [])
        calc_subtotal_prod = 0.0
        
        for p in productos:
            cant = get_float(p.get('cantidad', 0))
            precio = get_float(p.get('precio_unitario', 0))
            total_prod = get_float(p.get('total', 0))
            subtotal_prod = get_float(p.get('subtotal', 0))
            
            # Si hay subtotal explícito lo usamos, si no cantidad * precio
            if subtotal_prod > 0:
                calc_subtotal_prod += subtotal_prod
            elif total_prod > 0:
                # A veces total en linea incluye impuestos, a veces no. Asumimos que es el importe linea.
                calc_subtotal_prod += total_prod
            else:
                calc_subtotal_prod += (cant * precio)

        extracted_subtotal = get_float(data.get('totales', {}).get('subtotal', 0))
        
        # Margen de tolerancia (0.50 para errores de redondeo)
        diff_subtotal = abs(calc_subtotal_prod - extracted_subtotal)
        if diff_subtotal > 1.0:
            results['warnings'].append(f"⚠️ Discrepancia en Subtotal: Suma de productos (${calc_subtotal_prod:,.2f}) vs Subtotal extraído (${extracted_subtotal:,.2f})")
        
        # 2. Validar Operación Aritmética Final
        # Total = Subtotal - Descuentos + Impuestos - Retenciones
        extracted_total = get_float(data.get('totales', {}).get('total', 0))
        extracted_iva = get_float(data.get('totales', {}).get('iva', 0))
        extracted_descuento = get_float(data.get('totales', {}).get('descuento', 0))
        extracted_otros = get_float(data.get('totales', {}).get('otros_impuestos', 0))
        
        # Retenciones
        ret_iva = get_float(data.get('totales', {}).get('iva_retenido', 0))
        ret_isr = get_float(data.get('totales', {}).get('isr_retenido', 0))
        total_retenciones = ret_iva + ret_isr
        
        # Calculamos el total esperado basado en el subtotal extraído (que suele ser la base imponible correcta)
        calc_total = extracted_subtotal - extracted_descuento + extracted_iva + extracted_otros - total_retenciones
        
        diff_total = abs(calc_total - extracted_total)
        
        results['details'] = {
            'calc_subtotal_productos': calc_subtotal_prod,
            'extracted_subtotal': extracted_subtotal,
            'calc_total': calc_total,
            'extracted_total': extracted_total
        }

        if diff_total > 1.0:
            results['errors'].append(f"❌ Error Matemático: (Subtotal - Desc + Impuestos - Ret) = ${calc_total:,.2f}, pero el documento dice ${extracted_total:,.2f}")
            results['is_valid'] = False
        
    except Exception as e:
        results['warnings'].append(f"No se pudo validar matemáticamente: {str(e)}")
    
    return results

def test_connection(api_key, model_name):
    """Prueba la conexión con Gemini."""
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=model_name,
            contents="Responde solo con la palabra 'OK' si me lees."
        )
        return True, response.text
    except Exception as e:
        return False, str(e)

def get_available_models(api_key):
    """Obtiene la lista de modelos disponibles con la API key."""
    try:
        client = genai.Client(api_key=api_key)
        models = client.models.list()
        # Filtrar solo modelos generativos Gemini
        gemini_models = [
            m.name.replace('models/', '') 
            for m in models 
            if 'gemini' in m.name.lower()
        ]
        return True, gemini_models if gemini_models else DEFAULT_MODELS
    except Exception as e:
        return False, DEFAULT_MODELS

# --- Barra Lateral: Configuración ---
with st.sidebar:
    st.markdown("### ⚙️ Configuración")
    st.markdown("---")
    
    api_key = st.text_input("🔑 Gemini API Key", type="password", help="Ingresa tu API Key de Google AI Studio")
    
    # Inicializar session state para modelos
    if 'available_models' not in st.session_state:
        st.session_state.available_models = DEFAULT_MODELS
    
    # Botón para cargar modelos disponibles
    if api_key and st.button("🔄 Cargar Modelos Disponibles", use_container_width=True):
        with st.spinner("Obteniendo modelos..."):
            success, models = get_available_models(api_key)
            if success and models:
                st.session_state.available_models = models
                st.success(f"✅ {len(models)} modelos encontrados")
            else:
                st.warning("⚠️ Usando modelos por defecto")
    
    model_option = st.selectbox(
        "🤖 Modelo",
        st.session_state.available_models,
        index=0,
        help="Flash: rápido y económico | Pro: más preciso"
    )
    
    st.markdown("---")
    
    if st.button("🔗 Probar Conexión", use_container_width=True):
        if api_key:
            with st.spinner("Conectando..."):
                success, msg = test_connection(api_key, model_option)
                if success:
                    st.success("✅ Conectado")
                else:
                    st.error(f"❌ Error: {msg}")
        else:
            st.warning("⚠️ Ingresa una API Key")
    
    st.markdown("---")
    st.caption("💡 Obtén tu API Key en [Google AI Studio](https://makersuite.google.com/app/apikey)")

# --- Lógica Principal ---

st.markdown("# 📄 Extractor de Facturas")
st.markdown("Carga tu factura PDF, revisa y edita los datos extraídos automáticamente")
st.markdown("---")

uploaded_file = st.file_uploader("📎 Selecciona tu factura PDF", type="pdf")

# Inicializar estado de sesión para guardar los datos extraídos
if 'data_extracted' not in st.session_state:
    st.session_state.data_extracted = None
if 'pdf_text' not in st.session_state:
    st.session_state.pdf_text = None

if uploaded_file is not None:
    st.markdown("---")

if uploaded_file is not None and api_key:
    
    col_btn, col_space = st.columns([1, 3])
    with col_btn:
        analyze_btn = st.button("🔍 Analizar Factura", use_container_width=True, type="primary")
    
    if analyze_btn:
        progress_bar = st.progress(0, text="Iniciando análisis...")
        
        try:
            # 1. Preparar PDF como bytes
            progress_bar.progress(20, text="📤 Preparando PDF...")
            pdf_bytes = uploaded_file.getvalue()
            
            # 2. Configurar Cliente Gemini
            progress_bar.progress(30, text="🔧 Configurando IA...")
            client = genai.Client(api_key=api_key)
            
            # 3. Configuración del modelo
            progress_bar.progress(40, text="⚙️ Optimizando parámetros...")
            
            config = types.GenerateContentConfig(
                temperature=0.1,  # Baja temperatura para precisión
                top_p=0.95,
                top_k=40,
                max_output_tokens=8192,
                response_mime_type="application/json"  # Forzar respuesta JSON
            )
            
            # 4. Prompt Estructurado y Detallado
            progress_bar.progress(50, text="🤖 Analizando documento con IA...")
            
            prompt = """Analiza este documento PDF (factura) y extrae TODOS los datos con máxima precisión.
            
            IMPORTANTE: 
            - Lee CADA línea del documento, incluyendo encabezados, tablas, pies de página
            - Los números deben ser numéricos (float/int), NO strings
            - Elimina símbolos de moneda ($, €, etc.)
            - Si un campo no está visible, déjalo vacío o en 0
            
            Devuelve un JSON válido con esta estructura:
            {
              "vendedor": {
                "nombre": "",
                "razon_social": "",
                "direccion": "",
                "ciudad": "",
                "estado": "",
                "codigo_postal": "",
                "pais": "",
                "rfc_tax_id": "",
                "telefono": "",
                "email": "",
                "sitio_web": ""
              },
              "comprador": {
                "nombre": "",
                "razon_social": "",
                "direccion": "",
                "ciudad": "",
                "estado": "",
                "codigo_postal": "",
                "pais": "",
                "rfc_tax_id": "",
                "telefono": "",
                "email": "",
                "contacto": ""
              },
              "detalles_factura": {
                "numero": "",
                "serie": "",
                "folio_fiscal": "",
                "fecha_emision": "",
                "fecha_vencimiento": "",
                "orden_compra": "",
                "condiciones_pago": "",
                "metodo_pago": "",
                "forma_pago": "",
                "moneda": "MXN",
                "tipo_cambio": 1.0,
                "uso_cfdi": "",
                "lugar_expedicion": ""
              },
              "productos": [
                {
                  "clave": "",
                  "descripcion": "",
                  "unidad": "",
                  "cantidad": 0.0,
                  "precio_unitario": 0.0,
                  "descuento": 0.0,
                  "subtotal": 0.0,
                  "impuestos": 0.0,
                  "total": 0.0
                }
              ],
              "totales": {
                "subtotal": 0.0,
                "descuento": 0.0,
                "subtotal_con_descuento": 0.0,
                "iva": 0.0,
                "isr_retenido": 0.0,
                "iva_retenido": 0.0,
                "otros_impuestos": 0.0,
                "total": 0.0,
                "total_letra": ""
              },
              "observaciones": "",
              "notas": ""
            }
            """
            
            # 5. Crear Part desde bytes (método recomendado por Google)
            pdf_part = types.Part.from_bytes(
                data=pdf_bytes,
                mime_type='application/pdf'
            )
            
            # 6. Generar contenido con el nuevo API
            progress_bar.progress(70, text="⚡ Procesando respuesta...")
            response = client.models.generate_content(
                model=model_option,
                contents=[pdf_part, prompt],
                config=config
            )
            
            # 7. Parsear JSON
            progress_bar.progress(90, text="📋 Estructurando datos...")
            
            # Debug: Mostrar respuesta raw
            with st.expander("🔍 Debug: Ver respuesta de IA"):
                st.text_area("Respuesta raw", response.text, height=200)
            
            try:
                data = json.loads(response.text)
                
                # Validar estructura básica
                if not isinstance(data, dict):
                    raise ValueError("La respuesta no es un objeto JSON válido")
                
                # Asegurar claves principales
                for key in ['vendedor', 'comprador', 'detalles_factura', 'productos', 'totales']:
                    if key not in data:
                        data[key] = {} if key != 'productos' else []
                
                # Validar coherencia matemática
                validation = validate_invoice_data(data)
                st.session_state.validation_results = validation
                
                progress_bar.progress(100, text="✅ Completado!")
                st.session_state.data_extracted = data
                st.success("🎉 Factura procesada exitosamente!")
                progress_bar.empty()
                st.rerun()
                
            except json.JSONDecodeError as je:
                progress_bar.empty()
                st.error(f"❌ Error al parsear JSON: {je}")
                st.error("La IA no devolvió un JSON válido.")
                
                with st.expander("📄 Ver respuesta completa de la IA"):
                    st.code(response.text, language='text')
                
                st.warning("💡 Intenta con gemini-2.5-pro para mejor precisión")
            
        except Exception as e:
            progress_bar.empty()
            st.error(f"❌ Error durante el procesamiento: {str(e)}")
            st.info("💡 Verifica tu API Key y conexión a internet.")
            
            # Mostrar más detalles del error
            with st.expander("🔍 Detalles del error"):
                import traceback
                st.code(traceback.format_exc())

# --- Sección de Edición y Visualización ---

if st.session_state.data_extracted:
    data = st.session_state.data_extracted
    
    st.markdown("---")
    st.markdown("### 📊 Datos Extraídos - Edición Completa")
    
    # Mostrar resultados de validación
    if 'validation_results' in st.session_state and st.session_state.validation_results:
        with st.expander("🔍 Reporte de Validación y Coherencia", expanded=True):
            val = st.session_state.validation_results
            
            if val['errors']:
                st.markdown("#### ❌ Errores Críticos")
                for err in val['errors']:
                    st.error(err)
            
            if val['warnings']:
                st.markdown("#### ⚠️ Advertencias")
                for warn in val['warnings']:
                    st.warning(warn)
            
            if not val['errors'] and not val['warnings']:
                st.success("✅ Todos los cálculos coinciden correctamente (Suma de productos = Subtotal, Subtotal + Impuestos = Total)")
            
            # Mostrar detalles de cálculo si hay dudas
            if val.get('details'):
                with st.expander("Ver detalles de cálculo"):
                    st.json(val['details'])

    # Tabs para organizar mejor la información
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["🏢 Emisor/Receptor", "🧾 Detalles Factura", "📦 Productos", "💰 Totales", "📝 Notas"])
    
    with tab1:
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("#### 🏢 Datos del Vendedor/Emisor")
            if 'vendedor' not in data:
                data['vendedor'] = {}
            
            data['vendedor']['nombre'] = st.text_input("Nombre Comercial", data['vendedor'].get('nombre', ''), key="v_nom")
            data['vendedor']['razon_social'] = st.text_input("Razón Social", data['vendedor'].get('razon_social', ''), key="v_rs")
            data['vendedor']['rfc_tax_id'] = st.text_input("RFC / Tax ID", data['vendedor'].get('rfc_tax_id', ''), key="v_rfc")
            data['vendedor']['direccion'] = st.text_area("Dirección", data['vendedor'].get('direccion', ''), key="v_dir", height=80)
            
            col_v1, col_v2, col_v3 = st.columns(3)
            with col_v1:
                data['vendedor']['ciudad'] = st.text_input("Ciudad", data['vendedor'].get('ciudad', ''), key="v_city")
            with col_v2:
                data['vendedor']['estado'] = st.text_input("Estado", data['vendedor'].get('estado', ''), key="v_state")
            with col_v3:
                data['vendedor']['codigo_postal'] = st.text_input("CP", data['vendedor'].get('codigo_postal', ''), key="v_cp")
            
            data['vendedor']['pais'] = st.text_input("País", data['vendedor'].get('pais', ''), key="v_pais")
            data['vendedor']['telefono'] = st.text_input("Teléfono", data['vendedor'].get('telefono', ''), key="v_tel")
            data['vendedor']['email'] = st.text_input("Email", data['vendedor'].get('email', ''), key="v_email")
            data['vendedor']['sitio_web'] = st.text_input("Sitio Web", data['vendedor'].get('sitio_web', ''), key="v_web")
        
        with col2:
            st.markdown("#### 👤 Datos del Comprador/Receptor")
            if 'comprador' not in data:
                data['comprador'] = {}
            
            data['comprador']['nombre'] = st.text_input("Nombre Comercial", data['comprador'].get('nombre', ''), key="c_nom")
            data['comprador']['razon_social'] = st.text_input("Razón Social", data['comprador'].get('razon_social', ''), key="c_rs")
            data['comprador']['rfc_tax_id'] = st.text_input("RFC / Tax ID", data['comprador'].get('rfc_tax_id', ''), key="c_rfc")
            data['comprador']['direccion'] = st.text_area("Dirección", data['comprador'].get('direccion', ''), key="c_dir", height=80)
            
            col_c1, col_c2, col_c3 = st.columns(3)
            with col_c1:
                data['comprador']['ciudad'] = st.text_input("Ciudad", data['comprador'].get('ciudad', ''), key="c_city")
            with col_c2:
                data['comprador']['estado'] = st.text_input("Estado", data['comprador'].get('estado', ''), key="c_state")
            with col_c3:
                data['comprador']['codigo_postal'] = st.text_input("CP", data['comprador'].get('codigo_postal', ''), key="c_cp")
            
            data['comprador']['pais'] = st.text_input("País", data['comprador'].get('pais', ''), key="c_pais")
            data['comprador']['telefono'] = st.text_input("Teléfono", data['comprador'].get('telefono', ''), key="c_tel")
            data['comprador']['email'] = st.text_input("Email", data['comprador'].get('email', ''), key="c_email")
            data['comprador']['contacto'] = st.text_input("Persona de Contacto", data['comprador'].get('contacto', ''), key="c_cont")
    
    with tab2:
        st.markdown("#### 🧾 Información de la Factura")
        if 'detalles_factura' not in data:
            data['detalles_factura'] = {}
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            data['detalles_factura']['numero'] = st.text_input("N° Factura", data['detalles_factura'].get('numero', ''), key="f_num")
            data['detalles_factura']['serie'] = st.text_input("Serie", data['detalles_factura'].get('serie', ''), key="f_serie")
            data['detalles_factura']['folio_fiscal'] = st.text_input("Folio Fiscal / UUID", data['detalles_factura'].get('folio_fiscal', ''), key="f_folio")
            data['detalles_factura']['fecha_emision'] = st.text_input("Fecha Emisión", data['detalles_factura'].get('fecha_emision', ''), key="f_fec")
            data['detalles_factura']['fecha_vencimiento'] = st.text_input("Fecha Vencimiento", data['detalles_factura'].get('fecha_vencimiento', ''), key="f_venc")
        
        with col2:
            data['detalles_factura']['orden_compra'] = st.text_input("Orden de Compra", data['detalles_factura'].get('orden_compra', ''), key="f_oc")
            data['detalles_factura']['condiciones_pago'] = st.text_input("Condiciones de Pago", data['detalles_factura'].get('condiciones_pago', ''), key="f_cond")
            data['detalles_factura']['metodo_pago'] = st.text_input("Método de Pago", data['detalles_factura'].get('metodo_pago', ''), key="f_met")
            data['detalles_factura']['forma_pago'] = st.text_input("Forma de Pago", data['detalles_factura'].get('forma_pago', ''), key="f_forma")
        
        with col3:
            data['detalles_factura']['moneda'] = st.text_input("Moneda", data['detalles_factura'].get('moneda', 'MXN'), key="f_mon")
            data['detalles_factura']['tipo_cambio'] = st.number_input("Tipo de Cambio", value=float(data['detalles_factura'].get('tipo_cambio', 1.0)), key="f_tc", format="%.4f")
            data['detalles_factura']['uso_cfdi'] = st.text_input("Uso CFDI", data['detalles_factura'].get('uso_cfdi', ''), key="f_cfdi")
            data['detalles_factura']['lugar_expedicion'] = st.text_input("Lugar Expedición", data['detalles_factura'].get('lugar_expedicion', ''), key="f_lugar")
    
    with tab3:
        st.markdown("#### 📦 Productos / Conceptos")
        
        if 'productos' in data and data['productos']:
            df_products = pd.DataFrame(data['productos'])
            
            # Asegurar que todas las columnas existan
            expected_cols = ['clave', 'descripcion', 'unidad', 'cantidad', 'precio_unitario', 'descuento', 'subtotal', 'impuestos', 'total']
            for col in expected_cols:
                if col not in df_products.columns:
                    df_products[col] = '' if col in ['clave', 'descripcion', 'unidad'] else 0.0
            
            edited_df = st.data_editor(
                df_products[expected_cols],
                num_rows="dynamic",
                use_container_width=True,
                hide_index=True,
                column_config={
                    "clave": st.column_config.TextColumn("Clave/SKU", width="small"),
                    "descripcion": st.column_config.TextColumn("Descripción", width="large"),
                    "unidad": st.column_config.TextColumn("Unidad", width="small"),
                    "cantidad": st.column_config.NumberColumn("Cant.", format="%.2f"),
                    "precio_unitario": st.column_config.NumberColumn("Precio Unit.", format="$%.2f"),
                    "descuento": st.column_config.NumberColumn("Descuento", format="$%.2f"),
                    "subtotal": st.column_config.NumberColumn("Subtotal", format="$%.2f"),
                    "impuestos": st.column_config.NumberColumn("Impuestos", format="$%.2f"),
                    "total": st.column_config.NumberColumn("Total", format="$%.2f"),
                }
            )
            
            data['productos'] = edited_df.to_dict(orient='records')
        else:
            st.info("No se detectaron productos. Usa el botón '+' en la tabla para agregar.")
            data['productos'] = []
    
    with tab4:
        st.markdown("#### 💰 Resumen de Totales")
        if 'totales' not in data:
            data['totales'] = {}
        
        col1, col2 = st.columns(2)
        
        with col1:
            data['totales']['subtotal'] = st.number_input("Subtotal", value=float(data['totales'].get('subtotal', 0.0)), key="t_sub", format="%.2f")
            data['totales']['descuento'] = st.number_input("Descuento", value=float(data['totales'].get('descuento', 0.0)), key="t_desc", format="%.2f")
            data['totales']['subtotal_con_descuento'] = st.number_input("Subtotal con Descuento", value=float(data['totales'].get('subtotal_con_descuento', 0.0)), key="t_subdes", format="%.2f")
            data['totales']['iva'] = st.number_input("IVA", value=float(data['totales'].get('iva', 0.0)), key="t_iva", format="%.2f")
        
        with col2:
            data['totales']['isr_retenido'] = st.number_input("ISR Retenido", value=float(data['totales'].get('isr_retenido', 0.0)), key="t_isr", format="%.2f")
            data['totales']['iva_retenido'] = st.number_input("IVA Retenido", value=float(data['totales'].get('iva_retenido', 0.0)), key="t_ivar", format="%.2f")
            data['totales']['otros_impuestos'] = st.number_input("Otros Impuestos", value=float(data['totales'].get('otros_impuestos', 0.0)), key="t_otros", format="%.2f")
            data['totales']['total'] = st.number_input("TOTAL", value=float(data['totales'].get('total', 0.0)), key="t_total", format="%.2f")
        
        data['totales']['total_letra'] = st.text_input("Total en Letra", data['totales'].get('total_letra', ''), key="t_letra")
    
    with tab5:
        st.markdown("#### 📝 Observaciones y Notas")
        data['observaciones'] = st.text_area("Observaciones", data.get('observaciones', ''), height=100, key="obs")
        data['notas'] = st.text_area("Notas Adicionales", data.get('notas', ''), height=100, key="notas")

    # --- Guardar Resultado ---
    st.markdown("---")
    
    # Convertir el diccionario final (ya editado) a JSON string
    json_output = json.dumps(data, indent=4, ensure_ascii=False)
    
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        st.download_button(
            label="💾 Descargar JSON Completo",
            data=json_output,
            file_name=f"factura_{data.get('detalles_factura', {}).get('numero', 'sin_numero').replace('/', '_')}.json",
            mime="application/json",
            use_container_width=True,
            type="primary"
        )
    
    with col2:
        # Resumen rápido
        if st.button("📊 Ver Resumen", use_container_width=True):
            st.session_state.show_summary = not st.session_state.get('show_summary', False)
    
    with col3:
        # Botón para limpiar y empezar de nuevo
        if st.button("🗑️ Nueva Factura", use_container_width=True):
            st.session_state.data_extracted = None
            st.rerun()
    
    # Mostrar resumen si está activado
    if st.session_state.get('show_summary', False):
        st.markdown("#### 📊 Resumen Rápido")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Factura N°", data.get('detalles_factura', {}).get('numero', 'N/A'))
        with col2:
            st.metric("Productos", len(data.get('productos', [])))
        with col3:
            total = data.get('totales', {}).get('total', data.get('detalles_factura', {}).get('total', 0))
            st.metric("Total", f"${total:,.2f}")
        with col4:
            st.metric("Moneda", data.get('detalles_factura', {}).get('moneda', 'MXN'))
    
    # Vista previa del JSON final
    with st.expander("👁️ Ver JSON Completo Generado"):
        st.code(json_output, language='json')
        
        # Estadísticas del JSON
        st.caption(f"📏 Tamaño: {len(json_output)} caracteres | {len(json_output.encode('utf-8'))} bytes")

elif not api_key:
    st.info("👈 Configura tu API Key en la barra lateral para comenzar")
elif not uploaded_file:
    st.info("📤 Carga una factura PDF para comenzar")
    
    # Información adicional
    with st.expander("ℹ️ ¿Cómo usar esta aplicación?"):
        st.markdown("""
        ### 📖 Guía de Uso
        
        1. **Configura tu API Key**
           - Ve a la barra lateral (👈)
           - Pega tu API Key de Google Gemini
           - Opcionalmente carga los modelos disponibles
           - Prueba la conexión
        
        2. **Carga tu Factura**
           - Sube un archivo PDF de tu factura
           - Haz clic en "Analizar Factura"
           - Espera mientras la IA procesa el documento
        
        3. **Revisa y Edita**
           - Navega por las pestañas para ver todos los datos
           - Edita cualquier campo que necesite corrección
           - Agrega o elimina productos según necesites
        
        4. **Descarga**
           - Descarga el JSON con todos los datos estructurados
           - Usa este archivo en tu sistema de contabilidad
        
        ### 🎯 Datos que se extraen:
        - ✅ Información completa del emisor y receptor
        - ✅ Detalles fiscales (RFC, UUID, CFDI)
        - ✅ Productos con precios, cantidades e impuestos
        - ✅ Totales, subtotales, IVA y retenciones
        - ✅ Fechas, métodos de pago y condiciones
        - ✅ Notas y observaciones
        """)
    
    with st.expander("🔑 ¿Cómo obtener una API Key de Gemini?"):
        st.markdown("""
        1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
        2. Inicia sesión con tu cuenta de Google
        3. Haz clic en "Create API Key"
        4. Copia la clave generada
        5. Pégala en la barra lateral de esta aplicación
        
        **Nota:** La API de Gemini tiene un nivel gratuito generoso.
        """)
