#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * 🗄️ HERRAMIENTA 3: GESTOR DE BASES DE DATOS
 * ═══════════════════════════════════════════════════════════
 *
 * Opciones:
 * 1. Verificar integridad de todas las DBs
 * 2. Reparar bases de datos corruptas
 * 3. Crear DB faltante para negocio
 * 4. Eliminar DB de negocio inactivo
 * 5. Backup de todas las DBs
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const MASTER_DB = path.join(__dirname, '..', 'backend', 'data', 'gestor_tienda.db');
const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');
const BACKUP_DIR = path.join(__dirname, 'backups');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '🗄️  GESTOR DE BASES DE DATOS');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

async function main() {
  const db = new Database(MASTER_DB);

  try {
    const negocios = db.prepare('SELECT * FROM negocios').all();

    console.log('📊 ESTADO DE LAS BASES DE DATOS:\n');

    const analisis = [];
    negocios.forEach((negocio) => {
      const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
      const existe = fs.existsSync(dbFile);
      const tamaño = existe ? fs.statSync(dbFile).size : 0;

      analisis.push({
        negocio,
        dbFile,
        existe,
        tamaño,
        estado: existe ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m',
      });

      console.log(`${existe ? '\x1b[32m✅\x1b[0m' : '\x1b[31m❌\x1b[0m'} ${negocio.nombre}`);
      console.log(`   Archivo: ${negocio.id}.db`);
      console.log(`   Tamaño: ${(tamaño / 1024).toFixed(2)} KB`);
      console.log(`   Estado: ${negocio.estado}\n`);
    });

    const faltantes = analisis.filter((a) => !a.existe);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('OPCIONES DISPONIBLES:\n');
    console.log('1. Verificar integridad de todas las DBs');
    console.log('2. Crear DBs faltantes');
    console.log('3. Reparar DB corrupta');
    console.log('4. Eliminar DB de negocio');
    console.log('5. Backup completo de todas las DBs');
    console.log('6. Salir\n');

    const opcion = await pregunta('Seleccione una opción (1-6): ');
    console.log('');

    switch (opcion.trim()) {
      case '1':
        await verificarIntegridad(analisis);
        break;
      case '2':
        await crearDBsFaltantes(faltantes);
        break;
      case '3':
        await repararDB(analisis);
        break;
      case '4':
        await eliminarDB(db, analisis);
        break;
      case '5':
        await hacerBackup(analisis);
        break;
      case '6':
        console.log('Saliendo...\n');
        break;
      default:
        console.log('\x1b[31mOpción no válida.\x1b[0m\n');
    }
  } catch (error) {
    console.error('\n\x1b[31m❌ ERROR:\x1b[0m', error.message);
    process.exit(1);
  } finally {
    db.close();
    rl.close();
  }
}

async function verificarIntegridad(analisis) {
  console.log('🔍 VERIFICANDO INTEGRIDAD DE BASES DE DATOS...\n');

  const tablasEsperadas = [
    'productos',
    'compras',
    'compras_detalle',
    'ventas',
    'ventas_detalle',
    'clientes',
  ];

  analisis.forEach((a) => {
    if (!a.existe) {
      console.log(`\x1b[31m❌\x1b[0m ${a.negocio.nombre} - DB no existe`);
      return;
    }

    try {
      const tenantDb = new Database(a.dbFile);

      // Verificar integridad SQLite
      const integridad = tenantDb.pragma('integrity_check');

      if (integridad[0].integrity_check === 'ok') {
        console.log(`\x1b[32m✅\x1b[0m ${a.negocio.nombre} - Integridad OK`);
      } else {
        console.log(`\x1b[31m❌\x1b[0m ${a.negocio.nombre} - CORRUPTA`);
        console.log(`   ${integridad[0].integrity_check}`);
      }

      // Verificar tablas
      const tablas = tenantDb
        .prepare(
          `
        SELECT name FROM sqlite_master WHERE type='table'
      `
        )
        .all()
        .map((t) => t.name);

      const faltantes = tablasEsperadas.filter((t) => !tablas.includes(t));

      if (faltantes.length > 0) {
        console.log(`   \x1b[33m⚠️  Tablas faltantes: ${faltantes.join(', ')}\x1b[0m`);
      }

      // Contar registros
      const productos = tenantDb.prepare('SELECT COUNT(*) as count FROM productos').get();
      const ventas = tenantDb.prepare('SELECT COUNT(*) as count FROM ventas').get();

      console.log(`   Productos: ${productos.count}, Ventas: ${ventas.count}`);

      tenantDb.close();
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${a.negocio.nombre} - Error: ${error.message}`);
    }

    console.log('');
  });

  console.log('\x1b[32m✅ Verificación completada\x1b[0m\n');
}

async function crearDBsFaltantes(faltantes) {
  if (faltantes.length === 0) {
    console.log('\x1b[32m✅ No hay bases de datos faltantes\x1b[0m\n');
    return;
  }

  console.log(`🔧 CREAR BASES DE DATOS FALTANTES (${faltantes.length}):\n`);

  faltantes.forEach((f) => {
    console.log(`   • ${f.negocio.nombre}`);
  });

  const confirmar = await pregunta('\n¿Crear todas las DBs faltantes? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n🔧 Creando bases de datos...\n');

  const schemaFile = path.join(__dirname, '..', 'backend', 'schema.sql');
  let schema = '';

  if (fs.existsSync(schemaFile)) {
    schema = fs.readFileSync(schemaFile, 'utf-8');
  }

  faltantes.forEach((f) => {
    try {
      const tenantDb = new Database(f.dbFile);

      if (schema) {
        tenantDb.exec(schema);
      } else {
        // Crear tablas básicas
        tenantDb.exec(`
          CREATE TABLE IF NOT EXISTS productos (
            id TEXT PRIMARY KEY,
            codigo TEXT UNIQUE,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            categoria_id TEXT,
            proveedor_id TEXT,
            precio_compra REAL DEFAULT 0,
            precio_venta REAL DEFAULT 0,
            stock INTEGER DEFAULT 0,
            stock_minimo INTEGER DEFAULT 10,
            activo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );
          
          CREATE TABLE IF NOT EXISTS compras (
            id TEXT PRIMARY KEY,
            numero TEXT UNIQUE,
            fecha TEXT NOT NULL,
            proveedor_nombre TEXT,
            subtotal REAL DEFAULT 0,
            iva REAL DEFAULT 0,
            total REAL DEFAULT 0,
            estado TEXT DEFAULT 'completada',
            created_at TEXT DEFAULT (datetime('now'))
          );
          
          CREATE TABLE IF NOT EXISTS compras_detalle (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            compra_id TEXT,
            producto_id TEXT,
            producto_nombre TEXT,
            cantidad REAL DEFAULT 1,
            precio_unitario REAL DEFAULT 0,
            total REAL DEFAULT 0,
            FOREIGN KEY (compra_id) REFERENCES compras(id)
          );
          
          CREATE TABLE IF NOT EXISTS ventas (
            id TEXT PRIMARY KEY,
            numero TEXT UNIQUE,
            fecha TEXT NOT NULL,
            cliente_nombre TEXT,
            subtotal REAL DEFAULT 0,
            iva REAL DEFAULT 0,
            total REAL DEFAULT 0,
            estado TEXT DEFAULT 'completada',
            created_at TEXT DEFAULT (datetime('now'))
          );
          
          CREATE TABLE IF NOT EXISTS ventas_detalle (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venta_id TEXT,
            producto_id TEXT,
            producto_nombre TEXT,
            cantidad INTEGER DEFAULT 1,
            precio_unitario REAL DEFAULT 0,
            total REAL DEFAULT 0,
            FOREIGN KEY (venta_id) REFERENCES ventas(id)
          );
          
          CREATE TABLE IF NOT EXISTS clientes (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            telefono TEXT,
            email TEXT,
            activo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
          );
        `);
      }

      tenantDb.close();
      console.log(`\x1b[32m✅\x1b[0m ${f.negocio.nombre} - DB creada`);
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${f.negocio.nombre}: ${error.message}`);
    }
  });

  console.log('\n\x1b[32m✅ Proceso completado\x1b[0m\n');
}

async function repararDB(analisis) {
  console.log('🔧 REPARAR BASE DE DATOS\n');

  console.log('Bases de datos disponibles:\n');
  analisis.forEach((a, i) => {
    if (a.existe) {
      console.log(`${i + 1}. ${a.negocio.nombre}`);
    }
  });

  const seleccion = await pregunta('\nSeleccionar DB a reparar (número): ');
  const index = parseInt(seleccion) - 1;

  if (index < 0 || index >= analisis.length || !analisis[index].existe) {
    console.log('\x1b[31mSelección no válida.\x1b[0m\n');
    return;
  }

  const db = analisis[index];
  console.log(`\n🔧 Reparando ${db.negocio.nombre}...\n`);

  try {
    const tenantDb = new Database(db.dbFile);

    // Vacuumizar (optimizar y reparar)
    console.log('Ejecutando VACUUM...');
    tenantDb.exec('VACUUM');

    // Reindexar
    console.log('Reindexando...');
    tenantDb.exec('REINDEX');

    // Verificar integridad
    const check = tenantDb.pragma('integrity_check');

    tenantDb.close();

    if (check[0].integrity_check === 'ok') {
      console.log('\n\x1b[32m✅ Base de datos reparada exitosamente\x1b[0m\n');
    } else {
      console.log('\n\x1b[31m❌ La base de datos sigue corrupta\x1b[0m\n');
      console.log(check[0].integrity_check);
    }
  } catch (error) {
    console.log(`\n\x1b[31m❌ Error: ${error.message}\x1b[0m\n`);
  }
}

async function eliminarDB(masterDb, analisis) {
  console.log('\x1b[31m🗑️  ELIMINAR BASE DE DATOS\x1b[0m\n');

  console.log('Negocios disponibles:\n');
  analisis.forEach((a, i) => {
    console.log(`${i + 1}. ${a.negocio.nombre} (${a.negocio.estado})`);
  });

  const seleccion = await pregunta('\nSeleccionar negocio (número): ');
  const index = parseInt(seleccion) - 1;

  if (index < 0 || index >= analisis.length) {
    console.log('\x1b[31mSelección no válida.\x1b[0m\n');
    return;
  }

  const negocio = analisis[index].negocio;

  console.log(`\n⚠️  ADVERTENCIA: Eliminará la base de datos de "${negocio.nombre}"`);
  console.log('Esta acción es IRREVERSIBLE.\n');

  const confirmar = await pregunta('Escriba el nombre del negocio para confirmar: ');

  if (confirmar !== negocio.nombre) {
    console.log('Operación cancelada.\n');
    return;
  }

  try {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);

    if (fs.existsSync(dbFile)) {
      fs.unlinkSync(dbFile);
      console.log(`\n\x1b[32m✅ Base de datos eliminada: ${negocio.id}.db\x1b[0m\n`);
    } else {
      console.log('\n\x1b[33m⚠️  La base de datos no existe\x1b[0m\n');
    }
  } catch (error) {
    console.log(`\n\x1b[31m❌ Error: ${error.message}\x1b[0m\n`);
  }
}

async function hacerBackup(analisis) {
  console.log('💾 BACKUP COMPLETO DE BASES DE DATOS\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`);

  fs.mkdirSync(backupFolder, { recursive: true });

  console.log(`Carpeta de backup: ${backupFolder}\n`);

  const confirmar = await pregunta('¿Crear backup de todas las DBs? (s/n): ');
  if (confirmar.toLowerCase() !== 's') {
    console.log('Operación cancelada.\n');
    return;
  }

  console.log('\n💾 Creando backups...\n');

  let exitosos = 0;

  analisis.forEach((a) => {
    if (!a.existe) return;

    try {
      const destino = path.join(backupFolder, `${a.negocio.id}.db`);
      fs.copyFileSync(a.dbFile, destino);
      console.log(`\x1b[32m✅\x1b[0m ${a.negocio.nombre}`);
      exitosos++;
    } catch (error) {
      console.log(`\x1b[31m❌\x1b[0m ${a.negocio.nombre}: ${error.message}`);
    }
  });

  // Backup del master DB
  try {
    const destinoMaster = path.join(backupFolder, 'gestor_tienda.db');
    fs.copyFileSync(MASTER_DB, destinoMaster);
    console.log(`\x1b[32m✅\x1b[0m gestor_tienda.db (Master)`);
    exitosos++;
  } catch (error) {
    console.log(`\x1b[31m❌\x1b[0m Master DB: ${error.message}`);
  }

  console.log(`\n\x1b[32m✅ Backup completado: ${exitosos} archivos\x1b[0m`);
  console.log(`Ubicación: ${backupFolder}\n`);
}

main();
