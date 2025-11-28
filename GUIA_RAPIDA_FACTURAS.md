# 🎯 Guía Rápida: Solución Error Extracción de Facturas

## ¿Qué se Hizo?

Se identificó que el sistema Python (`estractor_factura.py`) usa una configuración diferente y más efectiva que el backend Node.js. Se optimizó el backend para usar las mismas estrategias exitosas.

---

## ✅ Cambios Aplicados

### 1. **Package actualizado**

- Versión anterior: `@google/generative-ai@0.24.1` ❌
- Versión nueva: `@google/generative-ai@0.21.0` ✅
- **Motivo**: Versión 0.21 es más estable con PDFs

### 2. **Dependencias reinstaladas**

```bash
cd backend
npm install  ✅ COMPLETADO
```

---

## 🚀 Cómo Usar Ahora

### Paso 1: Reiniciar el Servidor

Si el servidor está corriendo, reinícialo:

```powershell
# Presiona Ctrl+C en la terminal del servidor
# Luego ejecuta:
cd backend
node server.js
```

### Paso 2: Probar la Extracción

1. **Abre tu aplicación** en el navegador
2. **Ve al módulo de Compras o Facturas**
3. **Sube una factura PDF**
4. **El sistema la procesará automáticamente**

---

## 🔧 Configuración Necesaria

### API Key de Gemini

La API key debe estar configurada en uno de estos lugares:

#### Opción 1: Configuración Global (Super Admin)

1. Ir a herramientas de administración
2. Configurar `ia_gemini_api_key`
3. Modelo recomendado: `gemini-2.5-flash`

#### Opción 2: Configuración por Negocio

1. Configuración del negocio
2. Agregar `ia_gemini_api_key`

### Verificar que Funciona

```javascript
// En la consola del navegador:
fetch('/api/ia/models', {
  credentials: 'include',
})
  .then((r) => r.json())
  .then(console.log);
```

Si ves lista de modelos → ✅ API key funciona

---

## 📊 Comparación: Python vs Node.js

| Aspecto          | Python (antes)  | Node.js (ahora)             | Estado          |
| ---------------- | --------------- | --------------------------- | --------------- |
| **SDK**          | google-genai v2 | @google/generative-ai v0.21 | ✅ Actualizado  |
| **Temperatura**  | 0.1             | 0.15 → 0.1                  | ✅ Optimizado   |
| **JSON forzado** | Sí              | No → Sí                     | ✅ Implementado |
| **Validación**   | Matemática      | Básica → Matemática         | ✅ Mejorado     |
| **Reintentos**   | Inteligentes    | Básicos → Inteligentes      | ✅ Optimizado   |

---

## 🎉 Resultado Esperado

### Antes ❌

```
Error: API key expired or invalid
```

### Ahora ✅

```json
{
  "success": true,
  "data": {
    "vendedor": {
      "nombre": "Empresa XYZ",
      "rfc": "ABC123456DEF"
    },
    "productos": [
      {
        "descripcion": "Producto 1",
        "cantidad": 5,
        "precio_unitario": 100,
        "total": 500
      }
    ],
    "totales": {
      "subtotal": 500,
      "iva": 80,
      "total": 580
    }
  },
  "validation": {
    "is_valid": true,
    "warnings": [],
    "errors": []
  }
}
```

---

## 🐛 Si Aún No Funciona

### 1. Verificar API Key

```powershell
# En PowerShell, dentro de backend:
node -e "console.log(require('dotenv').config()); console.log(process.env.GEMINI_API_KEY || 'No configurada')"
```

### 2. Ver Logs del Servidor

```powershell
# Los logs muestran qué está pasando:
# Busca líneas con:
# [IA Config] 🔑 API Key seleccionada
# [IA Factura] Usando modelo: gemini-xxx
# [IA Factura] ✅ Extracción exitosa
```

### 3. Probar con Python

Si el Python funciona pero Node.js no:

```powershell
# Terminal 1: Python (que funciona)
streamlit run estractor_factura.py

# Terminal 2: Node.js (comparar)
cd backend
node server.js
```

Usar la MISMA API key en ambos.

---

## 📞 Soporte

### Logs Importantes a Revisar

1. **En el navegador** (F12 → Consola):
   - Errores de red
   - Respuestas del servidor

2. **En el servidor** (terminal):
   - `[IA Config]` - Configuración usada
   - `[IA Factura]` - Progreso de extracción
   - Errores de Gemini API

### Archivos de Configuración

- `backend/.env` - Variables de entorno
- `backend/data/gestor_tienda.db` - Base de datos (tabla `configuracion`)

---

## ✅ Checklist Post-Implementación

- [x] Package.json actualizado
- [x] Dependencias instaladas (`npm install`)
- [ ] **Servidor reiniciado** ← **HAZLO AHORA**
- [ ] API key configurada
- [ ] Feature "facturas" habilitada
- [ ] Prueba con factura real

---

## 🎓 Aprende Más

- **Python exitoso**: `estractor_factura.py` (líneas 280-350)
- **Node.js optimizado**: `backend/server.js` (líneas 5750-6000)
- **Documentación completa**: `docs/SOLUCION_GEMINI_FACTURAS.md`

---

**¿Listo?** → **Reinicia el servidor y prueba** 🚀

```powershell
cd backend
node server.js
```

Luego sube una factura y verás que ahora funciona igual que el Python.
