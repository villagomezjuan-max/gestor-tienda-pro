/**
 * Script de pruebas de API multi-tenant
 * NOTA: El servidor debe estar corriendo en otro terminal antes de ejecutar esto
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);

    const options = {
      method,
      hostname: '127.0.0.1', // Usar IP directamente para evitar origin header
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        Host: 'localhost:3001', // Header Host necesario
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 PRUEBAS DE API MULTI-TENANT\n');
  console.log('='.repeat(60));

  // Test 1: Login
  console.log('\n1️⃣ TEST: Login con usuario admin');
  console.log('-'.repeat(60));

  try {
    const loginResponse = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123',
      negocioId: 'mecanica',
    });

    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('✅ Login exitoso');
      console.log(`   Usuario: ${loginResponse.data.user.username}`);
      console.log(`   Rol: ${loginResponse.data.user.rol}`);
      console.log(`   Negocio actual: ${loginResponse.data.user.negocioId}`);
      console.log(`   Negocios permitidos: ${loginResponse.data.user.negocios.join(', ')}`);

      const token = loginResponse.data.accessToken;

      // Test 2: Acceso autorizado
      console.log('\n2️⃣ TEST: Acceso a /api/clientes con negocio autorizado');
      console.log('-'.repeat(60));

      const clientesResponse = await makeRequest('GET', '/api/clientes', null, {
        Authorization: `Bearer ${token}`,
        'X-Negocio-Id': 'mecanica',
      });

      if (clientesResponse.status === 200) {
        console.log('✅ Acceso autorizado correctamente');
        console.log(
          `   Clientes obtenidos: ${Array.isArray(clientesResponse.data) ? clientesResponse.data.length : 'N/A'}`
        );
      } else {
        console.error('❌ Acceso denegado');
        console.error(`   Status: ${clientesResponse.status}`);
        console.error(`   Respuesta: ${JSON.stringify(clientesResponse.data, null, 2)}`);
      }

      // Test 3: Intento de acceso no autorizado
      console.log('\n3️⃣ TEST: Intento de acceso a negocio NO autorizado');
      console.log('-'.repeat(60));

      const unauthorizedResponse = await makeRequest('GET', '/api/clientes', null, {
        Authorization: `Bearer ${token}`,
        'X-Negocio-Id': 'ferreteria', // Usuario no tiene acceso a este negocio
      });

      if (unauthorizedResponse.status === 403) {
        console.log('✅ Acceso bloqueado correctamente (403 Forbidden)');
        console.log(`   Mensaje: ${unauthorizedResponse.data.message}`);
        console.log(`   Código: ${unauthorizedResponse.data.code}`);
        console.log(
          `   Negocios permitidos: ${unauthorizedResponse.data.allowedBusinesses?.join(', ') || 'N/A'}`
        );
      } else if (unauthorizedResponse.status === 400) {
        console.log('⚠️  Negocio no existe en el sistema (400 Bad Request)');
        console.log(`   Esto es esperado si "ferreteria" no está creado`);
      } else {
        console.error('❌ El acceso debería haber sido bloqueado');
        console.error(`   Status: ${unauthorizedResponse.status}`);
        console.error(`   Respuesta: ${JSON.stringify(unauthorizedResponse.data, null, 2)}`);
      }

      // Test 4: Verificar header X-Negocio-Id obligatorio
      console.log('\n4️⃣ TEST: Petición sin header X-Negocio-Id');
      console.log('-'.repeat(60));

      const noHeaderResponse = await makeRequest('GET', '/api/clientes', null, {
        Authorization: `Bearer ${token}`,
        // Sin X-Negocio-Id
      });

      if (noHeaderResponse.status === 200) {
        console.log('✅ Usa negocio por defecto del token');
      } else if (noHeaderResponse.status === 400) {
        console.log('⚠️  Header X-Negocio-Id es obligatorio');
      } else {
        console.log(`ℹ️  Status: ${noHeaderResponse.status}`);
      }
    } else {
      console.error('❌ Login falló');
      console.error(`   Status: ${loginResponse.status}`);
      console.error(`   Respuesta: ${JSON.stringify(loginResponse.data, null, 2)}`);
      return;
    }
  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error.message);
    console.error(error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ PRUEBAS COMPLETADAS');
  console.log('='.repeat(60));
  console.log('\nSi todos los tests pasaron, la implementación multi-tenant');
  console.log('está funcionando correctamente.\n');
}

// Ejecutar pruebas
runTests().catch(console.error);
