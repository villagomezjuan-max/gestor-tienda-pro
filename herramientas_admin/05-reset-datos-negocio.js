#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * 🗑️  HERRAMIENTA 5: LIMPIEZA TOTAL DE NEGOCIOS
 * ═══════════════════════════════════════════════════════════
 *
 * Esta utilidad elimina los registros operativos de cada negocio
 * (ventas, compras, movimientos, etc.) para dejar las bases de
 * datos limpias. Incluye confirmaciones dobles y permite decidir
 * si se conservan configuraciones y usuarios.
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');
const MASTER_DB = path.join(DATA_DIR, 'gestor_tienda.db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function printHeader() {
  console.clear();
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
  console.log('\x1b[31m%s\x1b[0m', '🗑️  LIMPIEZA TOTAL DE NEGOCIOS');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('Esta herramienta eliminará registros operativos de cada negocio.');
  console.log('Se recomienda realizar un BACKUP antes de continuar.');
  console.log('');
}

const ALWAYS_SKIP = new Set([
  'sqlite_sequence',
  'sqlite_stat1',
  'sqlite_stat4',
  'migrations',
  'schema_migrations',
  '__knex_migrations',
  '__knex_migrations_lock',
]);

const CORE_KEYWORDS = [
  'usuario',
  'config',
  'ajuste',
  'rol',
  'permiso',
  'negocio',
  'empresa',
  'serie',
  'integration',
];

function shouldSkipTable(tableName, preserveCore) {
  if (!tableName) return true;
  if (ALWAYS_SKIP.has(tableName)) return true;
  if (tableName.includes("'")) return true;
  if (tableName.includes('"')) return true;
  if (!preserveCore) return false;
  const lower = tableName.toLowerCase();
  return CORE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function purgeDatabase(dbPath, options) {
  const { preserveCore } = options;
  const db = new Database(dbPath);
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all()
    .map((row) => row.name);

  const summary = [];

  db.exec('BEGIN TRANSACTION');
  try {
    for (const tableName of tables) {
      if (shouldSkipTable(tableName, preserveCore)) {
        continue;
      }

      const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM "${tableName}"`);
      const { total } = countStmt.get();

      db.prepare(`DELETE FROM "${tableName}"`).run();
      summary.push({ tableName, removed: total });
    }

    // Reset autoincrement counters
    try {
      db.prepare('DELETE FROM sqlite_sequence').run();
    } catch (err) {
      // sqlite_sequence no existe en todas las bases, ignorar
    }

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }

  try {
    db.exec('VACUUM');
  } catch (vacuumError) {
    console.warn('No se pudo ejecutar VACUUM para', dbPath, vacuumError.message);
  }

  db.close();
  return summary.filter((item) => item.removed > 0);
}

function renderSummary(title, summary) {
  if (!summary.length) {
    console.log(`   ▹ ${title}: sin registros para eliminar.`);
    return;
  }
  console.log(`   ▹ ${title}:`);
  summary.forEach(({ tableName, removed }) => {
    console.log(`      • ${tableName}: ${removed} registros eliminados`);
  });
}

async function cleanMasterDatabase(preserveCore) {
  if (!fs.existsSync(MASTER_DB)) {
    console.log('   ▹ Base Maestra no encontrada, se omite.');
    return;
  }

  console.log('\n🧭 Limpiando base de datos maestra...');
  const summary = purgeDatabase(MASTER_DB, { preserveCore });
  renderSummary('Base Maestra', summary);
}

async function cleanTenantDatabases(masterDb, preserveCore) {
  const negocios = masterDb.prepare('SELECT id, nombre FROM negocios ORDER BY nombre').all();
  if (!negocios.length) {
    console.log('No se encontraron negocios registrados.');
    return;
  }

  console.log('\n🧹 Limpiando bases de datos de negocios...');
  for (const negocio of negocios) {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) {
      console.log(`   ▹ ${negocio.nombre || negocio.id}: base no encontrada, se omite.`);
      continue;
    }

    try {
      const summary = purgeDatabase(dbFile, { preserveCore });
      renderSummary(negocio.nombre || negocio.id, summary);
    } catch (error) {
      console.error(`   ✗ Error limpiando ${negocio.nombre || negocio.id}:`, error.message);
    }
  }
}

async function main() {
  printHeader();

  if (!fs.existsSync(DATA_DIR)) {
    console.error('❌ No se encontró el directorio de datos:', DATA_DIR);
    process.exit(1);
  }

  const primeraConfirmacion = await question('Escribe "LIMPIAR TODO" para continuar: ');
  if (primeraConfirmacion !== 'LIMPIAR TODO') {
    console.log('\nOperación cancelada.');
    rl.close();
    return;
  }

  const segundaConfirmacion = await question('Confirma escribiendo "ESTOY SEGURO": ');
  if (segundaConfirmacion !== 'ESTOY SEGURO') {
    console.log('\nOperación cancelada.');
    rl.close();
    return;
  }

  const preserveAnswer = await question('\n¿Conservar usuarios y configuraciones base? (s/n): ');
  const preserveCore = preserveAnswer.toLowerCase() !== 'n';

  const cleanMasterAnswer = await question('¿Limpiar también la base maestra? (s/n): ');
  const cleanMaster = cleanMasterAnswer.toLowerCase() === 's';

  console.log('\nIniciando limpieza...');

  let masterDb = null;
  try {
    masterDb = fs.existsSync(MASTER_DB) ? new Database(MASTER_DB) : null;
  } catch (error) {
    console.error('❌ No se pudo abrir la base maestra:', error.message);
    rl.close();
    process.exit(1);
  }

  try {
    if (masterDb) {
      await cleanTenantDatabases(masterDb, preserveCore);
    } else {
      console.warn('⚠️  No se pudo leer la lista de negocios (base maestra ausente).');
    }

    if (cleanMaster && masterDb) {
      await cleanMasterDatabase(preserveCore);
    }

    console.log('\n✅ Limpieza completada.');
    console.log('Recuerda reiniciar el servidor backend para cerrar conexiones abiertas.');
  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error.message);
  } finally {
    if (masterDb) {
      masterDb.close();
    }
    rl.close();
  }
}

main().catch((error) => {
  console.error('\n❌ Error inesperado:', error.message);
  rl.close();
  process.exit(1);
});
