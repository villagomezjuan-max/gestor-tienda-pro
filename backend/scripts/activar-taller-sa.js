/**
 * Script para cambiar el negocio activo a SUPER_ADMIN
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config_negocios.json');

console.log('🔄 Cambiando negocio activo a SUPER_ADMIN...\n');

try {
  // Leer configuración actual
  const configNegocios = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  console.log('📋 Estado actual:');
  console.log(`   Negocio activo: ${configNegocios.negocio_actual}`);
  console.log(`   Negocios disponibles: ${configNegocios.negocios.map((n) => n.id).join(', ')}\n`);

  // Verificar que super_admin existe
  const superAdmin = configNegocios.negocios.find((n) => n.id === 'super_admin');

  if (!superAdmin) {
    console.error('❌ SUPER_ADMIN no encontrado en config_negocios.json');
    process.exit(1);
  }

  // Cambiar negocio actual
  configNegocios.negocio_actual = 'super_admin';

  // Guardar configuración
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(configNegocios, null, 2), 'utf8');

  console.log('✅ Negocio cambiado exitosamente!');
  console.log(`   Nuevo negocio activo: ${configNegocios.negocio_actual}`);
  console.log(`   Base de datos: ${superAdmin.db_file}`);
  console.log('\n📌 IMPORTANTE: Reinicia el servidor backend para aplicar los cambios.');
  console.log('   cd backend && npm run start\n');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
