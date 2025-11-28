const http = require('http');
const https = require('https');

console.log('=== Prueba de API de compras ===\n');

// Función para hacer peticiones HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const client = options.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testAPI() {
  // 1. Probar login primero
  console.log('1. Probando login...');
  try {
    const loginData = JSON.stringify({
      username: 'super_admin',
      password: 'admin123',
    });

    const loginResponse = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData),
        },
      },
      loginData
    );

    console.log('   Status:', loginResponse.statusCode);

    if (loginResponse.statusCode === 200) {
      const loginBody = JSON.parse(loginResponse.body);
      console.log('   Login exitoso:', loginBody.success);

      const token = loginBody.accessToken || loginBody.token;
      if (token) {
        console.log('   Token obtenido:', token.substring(0, 30) + '...');

        // 2. Probar endpoint de compras con token
        console.log('\n2. Probando /api/compras con token...');
        const comprasResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/api/compras',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Negocio-Id': 'super_admin',
            'Content-Type': 'application/json',
          },
        });

        console.log('   Status:', comprasResponse.statusCode);

        if (comprasResponse.statusCode === 200) {
          const compras = JSON.parse(comprasResponse.body);
          console.log(
            '   Compras obtenidas:',
            Array.isArray(compras) ? compras.length : 'respuesta no es array'
          );
          console.log('   ✅ Endpoint funcionando correctamente');
        } else {
          console.log('   ❌ Error:', comprasResponse.body);
        }
      } else {
        console.log('   ❌ No se obtuvo token');
        console.log('   Response:', loginResponse.body);
      }
    } else {
      console.log('   ❌ Login falló');
      console.log('   Response:', loginResponse.body);
    }
  } catch (e) {
    console.log('   ❌ Error de conexión:', e.message);
  }

  // 3. Probar endpoint sin token (debería fallar)
  console.log('\n3. Probando /api/compras sin token (debería fallar)...');
  try {
    const noAuthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/compras',
      method: 'GET',
      headers: {
        'X-Negocio-Id': 'super_admin',
        'Content-Type': 'application/json',
      },
    });

    console.log('   Status:', noAuthResponse.statusCode);
    if (noAuthResponse.statusCode === 401) {
      console.log('   ✅ Correctamente rechazado sin autenticación');
    } else {
      console.log('   Response:', noAuthResponse.body);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message);
  }
}

testAPI().catch(console.error);
