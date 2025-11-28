# 🔍 Análisis: Error API Key en Extracción de Facturas

## Problema Identificado

### SDK Utilizada

**Python (`estractor_factura.py`)** ✅ FUNCIONA:
```python
from google import genai  # SDK v2 - Nueva
client = genai.Client(api_key=api_key)
```

**Node.js (backend)** ❌ ERROR:
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');  // SDK v1 - Antigua
const genAI = new GoogleGenerativeAI(apiKey);
```

### Diferencias Clave

| Aspecto | Python (google-genai) | Node.js (@google/generative-ai) |
|---------|----------------------|-----------------------------------|
| **Versión SDK** | v2 (Nueva) | v1 (v0.24.1) |
| **API Key** | Validación moderna | Validación antigua |
| **Manejo errores** | Más robusto | Errores crípticos |
| **Response format** | `response_mime_type` | `responseMimeType` |
| **Parts API** | `Part.from_bytes()` | Inline base64 |

## Solución Propuesta

### Opción 1: Actualizar a SDK más reciente (RECOMENDADO)
```bash
npm install @google/generative-ai@latest
```

### Opción 2: Usar API REST directamente
Hacer llamadas HTTP directas al endpoint de Gemini como lo hace Python internamente.

### Opción 3: Crear microservicio Python
Ejecutar el código Python desde Node.js y comunicarse vía API local.

## Implementación Elegida: Actualizar SDK + Optimizar Código

Voy a:
1. Actualizar package.json a la versión más reciente
2. Adaptar el código para usar las mejores prácticas
3. Añadir mejor manejo de errores
4. Crear endpoint dedicado para extracción de facturas
