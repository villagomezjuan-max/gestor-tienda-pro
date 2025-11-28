// Script para aplicar migración de PDFs a la tabla compras
const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');

console.log('🔧 Iniciando migración de tabla compras...\n');

// Obtener todas las bases de datos de negocios
const dbFiles = fs
  .readdirSync(DATA_DIR)
  .filter((file) => file.endsWith('.db') && file !== 'gestor_tienda.db');

console.log(`Bases de datos encontradas: ${dbFiles.length}\n`);

// Aplicar migración a cada base de datos
dbFiles.forEach((dbFile) => {
  const dbPath = path.join(DATA_DIR, dbFile);
  console.log(`📂 Procesando: ${dbFile}`);

  try {
    const db = new Database(dbPath);

    // Verificar si las columnas ya existen
    const tableInfo = db.prepare('PRAGMA table_info(compras)').all();
    const hasColumns = tableInfo.some((col) => col.name === 'pdf_base64');

    if (hasColumns) {
      console.log(`  ⏭️  Las columnas PDF ya existen en ${dbFile}`);
      db.close();
      return;
    }

    // Aplicar migración
    db.exec(`
      BEGIN TRANSACTION;
      ALTER TABLE compras ADD COLUMN pdf_base64 TEXT;
      ALTER TABLE compras ADD COLUMN pdf_nombre TEXT;
      ALTER TABLE compras ADD COLUMN pdf_size INTEGER;
      COMMIT;
    `);

    // Verificar que se aplicó correctamente
    const newTableInfo = db.prepare('PRAGMA table_info(compras)').all();
    const verification = newTableInfo.some((col) => col.name === 'pdf_base64');

    if (verification) {
      console.log(`  ✅ Migración aplicada exitosamente a ${dbFile}`);
    } else {
      console.log(`  ❌ Error: Las columnas no fueron creadas en ${dbFile}`);
    }

    db.close();
  } catch (error) {
    console.error(`  ❌ Error procesando ${dbFile}:`, error.message);
  }
});

console.log('\n✨ Migración completada');
