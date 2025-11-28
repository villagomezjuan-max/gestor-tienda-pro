/**
 * Script para obtener una nueva API Key de Gemini
 *
 * PASOS PARA OBTENER TU API KEY:
 *
 * 1. Ve a Google AI Studio:
 *    https://makersuite.google.com/app/apikey
 *    O también: https://aistudio.google.com/app/apikey
 *
 * 2. Inicia sesión con tu cuenta de Google
 *
 * 3. Haz clic en "Create API Key" o "Get API Key"
 *
 * 4. Selecciona un proyecto de Google Cloud
 *    (Si no tienes uno, se creará automáticamente)
 *
 * 5. Copia la API Key generada (39 caracteres, empieza con "AIzaSy")
 *
 * 6. Pégala aquí abajo en la línea 22
 */

console.log('═══════════════════════════════════════════════════════');
console.log('🔑 CÓMO OBTENER UNA NUEVA API KEY DE GEMINI');
console.log('═══════════════════════════════════════════════════════\n');

console.log('📋 PASOS:');
console.log('');
console.log('1️⃣  Abre tu navegador y ve a:');
console.log('   🔗 https://makersuite.google.com/app/apikey');
console.log('   O también: https://aistudio.google.com/app/apikey');
console.log('');
console.log('2️⃣  Inicia sesión con tu cuenta de Google');
console.log('');
console.log('3️⃣  Haz clic en "Create API Key"');
console.log('');
console.log('4️⃣  Selecciona tu proyecto (o créalo si no tienes)');
console.log('');
console.log('5️⃣  ¡Listo! Copia la API Key generada');
console.log('');
console.log('📝 CARACTERÍSTICAS DE LA API KEY:');
console.log('   • Longitud: 39 caracteres');
console.log('   • Formato: AIzaSy + 33 caracteres más');
console.log('   • Ejemplo: AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ01234');
console.log('');
console.log('⚙️  UNA VEZ QUE TENGAS TU API KEY:');
console.log('');
console.log('   Opción 1 - Editar archivo:');
console.log('   1. Abre: backend/configurar-ia-global.js');
console.log("   2. Busca la línea: apiKey: '...',");
console.log('   3. Reemplaza con tu nueva API Key');
console.log('   4. Ejecuta: node backend/configurar-ia-global.js');
console.log('');
console.log('   Opción 2 - Comando directo (PowerShell):');
console.log('   $apiKey = "TU_API_KEY_AQUI"');
console.log(
  "   (Get-Content backend/configurar-ia-global.js) -replace 'apiKey: \\'[^\\']+\\'', \"apiKey: '$apiKey'\" | Set-Content backend/configurar-ia-global.js"
);
console.log('   node backend/configurar-ia-global.js');
console.log('');
console.log('💡 NOTA IMPORTANTE:');
console.log('   • La API de Gemini tiene un nivel GRATUITO generoso');
console.log('   • 15 requests/minuto gratis');
console.log('   • 1500 requests/día gratis');
console.log('   • Perfecto para procesar facturas');
console.log('');
console.log('📚 DOCUMENTACIÓN:');
console.log('   • Guía oficial: https://ai.google.dev/gemini-api/docs');
console.log('   • Precios: https://ai.google.dev/pricing');
console.log('');
console.log('═══════════════════════════════════════════════════════\n');

// Si quieres probar una API Key directamente, descomenta las siguientes líneas:
/*
const { GoogleGenerativeAI } = require('@google/generative-ai');

const TU_API_KEY_AQUI = 'AIzaSy...'; // Pega tu API Key aquí

async function probarApiKey() {
  try {
    console.log('\n🧪 Probando API Key...\n');
    const genAI = new GoogleGenerativeAI(TU_API_KEY_AQUI);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await model.generateContent('Di "Funciona" si me lees');
    const text = result.response.text();
    
    console.log('✅ API KEY VÁLIDA Y FUNCIONANDO');
    console.log(`Respuesta de Gemini: "${text}"\n`);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

probarApiKey();
*/
