/**
 * Test HTTP directo al endpoint /api/compras
 * Para diagnosticar el error 500
 */

const fs = require('fs');
const http = require('http');
const path = require('path');

const jwt = require('jsonwebtoken');

// Cargar configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_larga_y_segura_para_jwt_2024';

// Crear token de prueba como super_admin
function createTestToken() {
  const payload = {
    userId: 1,
    username: 'super_admin',
    rol: 'SUPER_ADMIN',
    negocioId: 'super_admin',
    negocios: ['super_admin'],
    isSuperAdmin: true,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testEndpoint() {
  console.log('🔍 Probando petición HTTP a /api/compras...\n');

  const token = createTestToken();
  console.log('📝 Token generado:', token.substring(0, 50) + '...\n');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/compras',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Negocio-Id': 'super_admin',
      },
    };

    console.log('📤 Enviando petición:', JSON.stringify(options, null, 2), '\n');

    const req = http.request(options, (res) => {
      let data = '';

      console.log(`📥 Status: ${res.statusCode}`);
      console.log('📥 Headers:', JSON.stringify(res.headers, null, 2));

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('\n📦 Respuesta:');
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(data);
        }

        if (res.statusCode === 200) {
          console.log('\n✅ ÉXITO - Endpoint funciona correctamente');
        } else {
          console.log(`\n❌ ERROR - Status ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Ejecutar
testEndpoint()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test falló:', err);
    process.exit(1);
  });
