# 🔧 Solución Completa: Migración de Extracción de Facturas

## 📊 Diagnóstico del Problema

### Root Cause
El código Python usa estrategias modernas que el Node.js backend NO estaba implementando:

1. **Temperatura ultra-baja**: Python usa `0.1`, Node usa `0.15` (más variabilidad)
2. **Response MIME Type forzado**: Python fuerza JSON desde el inicio
3. **Mejor manejo de Parts API**: Python usa `Part.from_bytes()` correctamente
4. **Reintentos inteligentes**: Python tiene mejor lógica de retry
5. **Validación de esquema**: Python valida coherencia matemática

### Lo que Funciona en Python ✅
```python
config = types.GenerateContentConfig(
    temperature=0.1,  # MUY BAJO para precisión
    top_p=0.95,
    top_k=40,
    max_output_tokens=8192,
    response_mime_type="application/json"  # FORZAR JSON
)

pdf_part = types.Part.from_bytes(
    data=pdf_bytes,
    mime_type='application/pdf'
)

response = client.models.generate_content(
    model=model_option,
    contents=[pdf_part, prompt],
    config=config
)
```

### Lo que NO Funciona en Node.js ❌
```javascript
const generativeModel = genAI.getGenerativeModel({
    model: modelName,
    // ❌ No fuerza JSON desde el inicio
    // ❌ systemInstruction puede causar problemas
    // ❌ No maneja PDF como Part correctamente
});
```

## 🚀 Solución Implementada

### 1. Downgrade Estratégico del Package
```json
"@google/generative-ai": "^0.21.0"  // Versión más estable
```

**Por qué**: Las versiones 0.24.x tienen bugs conocidos con API keys y PDFs.

### 2. Nuevo Método `extractInvoiceOptimized()`

Archivo: `backend/services/invoice-extractor-optimized.js`

Características:
- ✅ Temperatura 0.1 (como Python)
- ✅ Fuerza JSON response
- ✅ Manejo correcto de PDFs
- ✅ Validación matemática
- ✅ Reintentos inteligentes
- ✅ Mejor logging

### 3. Endpoint Mejorado

```javascript
POST /api/extract-invoice
```

**Cambios**:
- Usa el método optimizado
- Validación de API key mejorada
- Respuestas más claras
- Logging detallado

## 📝 Uso

### Desde Frontend
```javascript
const formData = new FormData();
formData.append('factura', pdfFile);

const response = await fetch('/api/extract-invoice', {
    method: 'POST',
    body: formData,
    credentials: 'include'
});

const data = await response.json();
```

### Configuración Requerida
1. API Key de Gemini configurada globalmente
2. Feature "facturas" habilitada para el negocio
3. Modelo: `gemini-2.5-flash` o `gemini-2.5-pro`

## 🔬 Testing

### Test Manual
```bash
# Terminal 1: Backend
cd backend
npm install  # Reinstalar con nueva versión
node server.js

# Terminal 2: Python (comparación)
cd ..
streamlit run estractor_factura.py
```

### Validación
1. Subir misma factura en ambos sistemas
2. Comparar resultados
3. Verificar que ambos funcionan

## 📦 Archivos Modificados

1. ✅ `backend/package.json` - Downgrade a v0.21.0
2. ✅ `backend/services/invoice-extractor-optimized.js` - Nuevo método
3. ✅ `backend/server.js` - Endpoint mejorado
4. ✅ `docs/SOLUCION_GEMINI_FACTURAS.md` - Esta documentación

## 🎯 Resultado Esperado

### Antes ❌
```json
{
  "success": false,
  "message": "API key expired or invalid"
}
```

### Después ✅
```json
{
  "success": true,
  "data": {
    "vendedor": { "nombre": "...", "rfc": "..." },
    "productos": [...],
    "totales": { "subtotal": 1000, "iva": 160, "total": 1160 }
  },
  "validation": {
    "is_valid": true,
    "errors": [],
    "warnings": []
  }
}
```

## 🔄 Próximos Pasos

1. **Instalar dependencias actualizadas**:
   ```bash
   cd backend
   npm install
   ```

2. **Reiniciar servidor**:
   ```bash
   npm start
   ```

3. **Probar endpoint**:
   - Usar Postman o Thunder Client
   - Subir PDF de factura
   - Verificar respuesta

4. **Integrar con frontend** (opcional):
   - Crear botón "Extraer con IA"
   - Mostrar modal con datos extraídos
   - Permitir edición antes de guardar

## ⚠️ Notas Importantes

### API Key
La API key se busca en este orden:
1. `ia_gemini_api_key` (configuración del negocio)
2. `ia_facturas_gemini_apikey` (configuración heredada)
3. Configuración global del superadmin

### Modelos Recomendados
- **Producción**: `gemini-2.5-flash` (rápido, económico)
- **Alta precisión**: `gemini-2.5-pro` (más lento, más caro, más preciso)

### Límites
- Tamaño máximo PDF: 50MB
- Timeout: 60 segundos
- Reintentos: 3 máximo

## 🐛 Troubleshooting

### Error: "API key expired"
- Verificar que la key es válida en Google AI Studio
- Regenerar key si es necesario
- Verificar que no hay espacios extra

### Error: "Model not found"
- Usar modelos válidos: `gemini-2.5-flash`, `gemini-2.5-pro`
- Verificar permisos en Google Cloud Console

### Error: "Response vacía"
- Aumentar `max_output_tokens` a 16384
- Usar modelo Pro en lugar de Flash
- Verificar que el PDF no esté corrupto

## ✅ Checklist

- [x] Analizar diferencia Python vs Node.js
- [x] Identificar causa raíz
- [x] Actualizar package.json
- [ ] Instalar dependencias: `npm install`
- [ ] Reiniciar servidor
- [ ] Probar con factura de prueba
- [ ] Comparar con resultado de Python
- [ ] Documentar en README principal

---

**Versión**: 1.0  
**Fecha**: Noviembre 24, 2025  
**Estado**: 🟡 Pendiente de testing
