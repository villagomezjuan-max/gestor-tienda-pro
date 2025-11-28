// ============================================
// SCRIPT: Instalador de Notificaciones Inteligentes
// ============================================
// Ejecutar: node backend/scripts/install-notifications.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const Database = require('better-sqlite3');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║   📢 Sistema de Notificaciones Inteligentes con IA       ║');
  console.log('║      Instalador Automático v1.0                          ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Paso 1: Verificar archivos
  console.log('📦 Paso 1/5: Verificando archivos...\n');

  const archivosRequeridos = [
    'backend/migrations/003_notificaciones_inteligentes.sql',
    'backend/services/ai-orchestrator.js',
    'backend/services/notification-hub.js',
    'backend/routes/notifications.js',
    'backend/utils/notification-helper.js',
    'js/notification-hub.js',
    'css/notification-hub.css',
  ];

  let faltantes = [];
  for (const archivo of archivosRequeridos) {
    const existe = fs.existsSync(archivo);
    console.log(`  ${existe ? '✅' : '❌'} ${archivo}`);
    if (!existe) faltantes.push(archivo);
  }

  if (faltantes.length > 0) {
    console.log(`\n❌ Faltan ${faltantes.length} archivo(s). Instalación cancelada.\n`);
    rl.close();
    process.exit(1);
  }

  console.log('\n✅ Todos los archivos presentes\n');

  // Paso 2: Configurar API keys
  console.log('🔑 Paso 2/5: Configuración de API Keys\n');

  const envPath = path.join(__dirname, '..', '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const configurarKeys = await question('¿Deseas configurar las API keys ahora? (s/n): ');

  if (configurarKeys.toLowerCase() === 's') {
    const geminiKey = await question('  Gemini API Key (Enter para omitir): ');
    const deepseekKey = await question('  DeepSeek API Key (Enter para omitir): ');

    if (geminiKey) {
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${geminiKey}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${geminiKey}`;
      }
    }

    if (deepseekKey) {
      if (envContent.includes('DEEPSEEK_API_KEY=')) {
        envContent = envContent.replace(/DEEPSEEK_API_KEY=.*/g, `DEEPSEEK_API_KEY=${deepseekKey}`);
      } else {
        envContent += `\nDEEPSEEK_API_KEY=${deepseekKey}`;
      }
    }

    // Agregar configuraciones adicionales
    if (!envContent.includes('DEEPSEEK_BASE_URL=')) {
      envContent += '\nDEEPSEEK_BASE_URL=https://api.deepseek.com';
    }
    if (!envContent.includes('NOTIF_ENABLE_IA=')) {
      envContent += '\nNOTIF_ENABLE_IA=true';
    }
    if (!envContent.includes('NOTIF_BATCH_WINDOW=')) {
      envContent += '\nNOTIF_BATCH_WINDOW=30';
    }
    if (!envContent.includes('NOTIF_MAX_DAILY_PER_USER=')) {
      envContent += '\nNOTIF_MAX_DAILY_PER_USER=50';
    }

    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ API keys configuradas en .env\n');
  } else {
    console.log('\n⚠️  Configuración de API keys omitida. Recuerda configurarlas manualmente.\n');
  }

  // Paso 3: Ejecutar migración
  console.log('🗄️  Paso 3/5: Ejecutando migración de base de datos...\n');

  const dbPath =
    (await question('  Ruta de la base de datos (Enter para ./data/tienda.db): ')) ||
    './data/tienda.db';

  try {
    const db = new Database(dbPath);
    const migrationSQL = fs.readFileSync(
      'backend/migrations/003_notificaciones_inteligentes.sql',
      'utf8'
    );

    db.exec(migrationSQL);
    console.log('  ✅ Tablas creadas exitosamente');
    console.log('  ✅ Vistas creadas');
    console.log('  ✅ Triggers configurados');

    // Verificar tablas
    const tablas = db
      .prepare(
        `
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name LIKE 'notificacion_%'
    `
      )
      .all();

    console.log(`\n  Tablas creadas: ${tablas.length}`);
    tablas.forEach((t) => console.log(`    - ${t.name}`));

    db.close();
    console.log('\n✅ Migración completada\n');
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error.message);
    rl.close();
    process.exit(1);
  }

  // Paso 4: Verificar dependencias npm
  console.log('📚 Paso 4/5: Verificando dependencias npm...\n');

  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const dependenciasRequeridas = {
    'node-cron': '^3.0.0',
    '@google/generative-ai': '^0.1.0',
  };

  const faltanDeps = [];
  for (const [dep, version] of Object.entries(dependenciasRequeridas)) {
    const instalada = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
    console.log(`  ${instalada ? '✅' : '❌'} ${dep}`);
    if (!instalada) faltanDeps.push(dep);
  }

  if (faltanDeps.length > 0) {
    console.log(`\n⚠️  Faltan ${faltanDeps.length} dependencia(s)`);
    const instalar = await question('¿Deseas instalarlas ahora? (s/n): ');

    if (instalar.toLowerCase() === 's') {
      console.log('\n  Ejecutando: npm install...');
      const { execSync } = require('child_process');
      try {
        execSync(`npm install ${faltanDeps.join(' ')}`, {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        });
        console.log('\n  ✅ Dependencias instaladas');
      } catch (error) {
        console.error('\n  ❌ Error instalando dependencias:', error.message);
      }
    }
  } else {
    console.log('\n✅ Todas las dependencias presentes\n');
  }

  // Paso 5: Generar código de integración
  console.log('🔧 Paso 5/5: Generando código de integración...\n');

  const integrationCode = `
// ============================================
// INTEGRACIÓN: Notification Hub
// Agregar este código a backend/server.js
// ============================================

// 1. Importar servicios (al inicio del archivo, con otros requires)
const NotificationHub = require('./services/notification-hub');
const createNotificationRoutes = require('./routes/notifications');

// 2. Inicializar hub (después de inicializar Express y DB)
const notificationHub = new NotificationHub(dbPath, {
  geminiApiKey: process.env.GEMINI_API_KEY,
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  enableIA: process.env.NOTIF_ENABLE_IA !== 'false',
  batchWindow: parseInt(process.env.NOTIF_BATCH_WINDOW) || 30,
  maxDailyPerUser: parseInt(process.env.NOTIF_MAX_DAILY_PER_USER) || 50
});

// 3. Registrar rutas (después de otras rutas)
app.use('/api/notifications', createNotificationRoutes(notificationHub, db));

// 4. Hacer disponible globalmente
global.notificationHub = notificationHub;

console.log('✅ NotificationHub integrado');

// 5. Cleanup al cerrar servidor
process.on('SIGINT', () => {
  console.log('Cerrando NotificationHub...');
  notificationHub.close();
  process.exit(0);
});
`;

  const integrationPath = path.join(__dirname, '..', 'integration-code.txt');
  fs.writeFileSync(integrationPath, integrationCode);

  console.log('  ✅ Código de integración generado: backend/integration-code.txt\n');

  // Resumen final
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║   ✅ INSTALACIÓN COMPLETADA EXITOSAMENTE                 ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('📋 PRÓXIMOS PASOS:\n');
  console.log('  1. Revisar backend/integration-code.txt');
  console.log('  2. Copiar el código a backend/server.js');
  console.log('  3. Reiniciar el servidor: node backend/server.js');
  console.log('  4. Agregar al HTML: <script src="js/notification-hub.js"></script>');
  console.log('  5. Agregar CSS: <link rel="stylesheet" href="css/notification-hub.css">');
  console.log('  6. Leer la documentación: GUIA_NOTIFICACIONES_IA.md\n');

  console.log('📚 RECURSOS:\n');
  console.log('  • Documentación completa: GUIA_NOTIFICACIONES_IA.md');
  console.log('  • Ejemplos de integración: backend/examples/notification-integration-example.js');
  console.log('  • Helper utilities: backend/utils/notification-helper.js\n');

  console.log('🎯 VERIFICAR INSTALACIÓN:\n');
  console.log('  node backend/server.js');
  console.log('  Abrir navegador: http://localhost:3000');
  console.log('  Ir a: #notificaciones\n');

  rl.close();
}

main().catch((error) => {
  console.error('\n❌ Error en instalación:', error);
  rl.close();
  process.exit(1);
});
