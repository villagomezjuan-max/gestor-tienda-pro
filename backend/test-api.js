const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/compras',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-Negocio-Id': 'super_admin',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 1000));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();
