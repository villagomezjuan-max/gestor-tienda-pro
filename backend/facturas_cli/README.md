# 📂 Facturas CLI - Procesadas con Gemini

Esta carpeta contiene las facturas procesadas por el CLI `gemini_pdf_2_json_cli.js`.

## 📁 Estructura

```
facturas_cli/
├── 1/              # Negocio ID 1
├── 2/              # Negocio ID 2
└── ...             # Otros negocios
```

## 🚀 Cómo usar

### 1. Configurar API Key de Gemini

```powershell
# PowerShell (temporal)
$env:GEMINI_API_KEY = "tu-api-key-aqui"

# PowerShell (permanente)
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'tu-api-key', 'User')
```

### 2. Procesar una factura PDF

```powershell
# Desde la raíz del proyecto
cd C:\Users\gabri\Desktop\e-comer_sto\Gestor_Tienda_pro\Gestor_Tienda_pro

# Procesar un PDF (se guarda en facturas_cli/1/)
node js\gemini_pdf_2_json_cli.js C:\ruta\a\factura.pdf backend\facturas_cli\1

# Procesar múltiples PDFs
node js\gemini_pdf_2_json_cli.js C:\facturas\*.pdf backend\facturas_cli\1
```

### 3. Cargar en el sistema

1. Abrir el módulo **Compras** en el navegador
2. Clic en botón **"📂 Cargar desde CLI"**
3. Seleccionar la factura procesada
4. Revisar datos extraídos
5. Editar si es necesario
6. Guardar en base de datos

## 📊 Ventajas del CLI

- ✅ **Más confiable** que el extractor web
- ✅ **Procesar lotes** de facturas offline
- ✅ **Revisar JSONs** antes de importar
- ✅ **Sin límite de tamaño** (web = 10MB)
- ✅ **Debugging** fácil con JSONs guardados

## 🔒 Seguridad

- Cada negocio tiene su propia carpeta (multi-tenant)
- El backend valida que solo se acceda a archivos propios
- Los JSONs se eliminan tras importar (opcional)

## 💡 Ejemplo de uso completo

```powershell
# 1. Procesar factura
node js\gemini_pdf_2_json_cli.js C:\Downloads\factura_proveedor.pdf backend\facturas_cli\1

# 2. El CLI mostrará:
# ═══════════════════════════════════════════════
# ✅ PROCESAMIENTO EXITOSO
# ═══════════════════════════════════════════════
# 📄 JSON guardado: backend\facturas_cli\1\factura_proveedor.json
# 🛒 Items extraídos: 5
# 💰 Total: $156.75
# 🏢 Proveedor: Repuestos XYZ
# 📅 Fecha: 2025-01-15
# ═══════════════════════════════════════════════

# 3. Abrir programa → Compras → "Cargar desde CLI" → Seleccionar y guardar
```

## 📝 Formato del JSON generado

El CLI genera JSONs compatibles con el sistema:

```json
{
  "proveedor": {
    "nombre": "Repuestos XYZ",
    "ruc": "1234567890001"
  },
  "fecha": "2025-01-15",
  "numero_factura": "001-001-000123",
  "subtotal": 136.3,
  "iva": 20.45,
  "otrosImpuestos": 0,
  "total": 156.75,
  "moneda": "USD",
  "items": [
    {
      "nombre": "Filtro de Aceite",
      "descripcion": "Filtro compatible con motores 1.6L",
      "unidad": "unidad",
      "cantidad": 2,
      "precioUnitario": 12.5,
      "subtotal": 25.0
    }
  ],
  "_metadata": {
    "procesadoPor": "gemini-cli",
    "modelo": "gemini-2.5-flash",
    "fecha": "2025-01-15T10:30:00.000Z",
    "archivoOrigen": "factura_proveedor.pdf"
  }
}
```

## 🛠️ Solución de problemas

### Error: "GEMINI_API_KEY no configurada"

```powershell
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY', 'tu-key', 'User')
# Reiniciar PowerShell después de configurar
```

### Error: "PDF no encontrado"

- Verifica la ruta completa del PDF
- Usa comillas si la ruta tiene espacios: `"C:\Mis Documentos\factura.pdf"`

### El CLI procesa pero no aparece en el programa

- Verifica que guardaste en la carpeta correcta (`backend\facturas_cli\1`)
- Asegúrate que el `negocioId` coincida (1, 2, etc.)
- Recarga la página del programa

## 📞 Soporte

Para más ayuda, ejecuta:

```powershell
node js\gemini_pdf_2_json_cli.js --help
```
