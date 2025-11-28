#!/usr/bin/env node

/**
 * Script para aplicar migraciones de base de datos
 * Ejecutar: node apply-migrations.js
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Rutas de bases de datos
const masterDbPath = path.join(__dirname, 'data', 'master.db');
const migrationsDir = path.join(__dirname, 'migrations');

console.log('🔄 Aplicando migraciones de base de datos...\n');

try {
  // Conectar a master.db
  const db = new Database(masterDbPath);

  // Obtener version actual
  const pragma = db.prepare('PRAGMA user_version').all();
  const currentVersion = pragma[0].user_version || 0;
  console.log(`📊 Versión actual del esquema: ${currentVersion}`);

  // Leer y aplicar migraciones
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let applied = 0;

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log(`\n✏️  Aplicando: ${file}`);

    try {
      // Dividir por ; para ejecutar múltiples statements
      const statements = sql.split(';').filter((s) => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          db.exec(statement);
        }
      }

      console.log(`✅ ${file} - OK`);
      applied++;
    } catch (err) {
      console.error(`❌ Error en ${file}:`, err.message);
    }
  }

  // Obtener nueva version
  const newPragma = db.prepare('PRAGMA user_version').all();
  const newVersion = newPragma[0].user_version || 0;

  console.log(`\n📊 Nueva versión del esquema: ${newVersion}`);
  console.log(`✅ Migraciones completadas: ${applied}/${migrationFiles.length}`);

  // Verificar que tablas existan
  console.log('\n🔍 Verificando tablas creadas...');

  const tablesCheck = ['usuario_modulos_permitidos', 'negocio_modulos_default'];

  for (const table of tablesCheck) {
    const result = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
      .all(table);
    if (result.length > 0) {
      console.log(`  ✅ ${table}`);
    } else {
      console.log(`  ❌ ${table} - NO ENCONTRADA`);
    }
  }

  db.close();
  console.log('\n✨ Migraciones completadas exitosamente');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
