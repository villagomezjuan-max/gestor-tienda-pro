/**
 * Script de migración de contraseñas
 * Convierte hashes inseguros antiguos a bcrypt
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

const { hashPassword, isBcryptHash } = require('../utils/password');

async function migratePasswords() {
  const DATA_DIR = path.join(__dirname, '..', 'data');

  if (!fs.existsSync(DATA_DIR)) {
    console.error('❌ Directorio de datos no encontrado:', DATA_DIR);
    return;
  }

  const dbFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.db'));

  if (dbFiles.length === 0) {
    console.log('⚠️  No se encontraron bases de datos para migrar');
    return;
  }

  console.log('🔐 Iniciando migración de contraseñas a bcrypt...\n');
  console.log(`📂 Directorio: ${DATA_DIR}`);
  console.log(`📊 Bases de datos encontradas: ${dbFiles.length}\n`);

  let totalMigrados = 0;
  let totalYaBcrypt = 0;
  let totalErrores = 0;

  for (const dbFile of dbFiles) {
    const dbPath = path.join(DATA_DIR, dbFile);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 Procesando: ${dbFile}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    let db;
    try {
      db = new Database(dbPath);

      // Verificar si la tabla usuarios existe
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
        .get();

      if (!tableExists) {
        console.log(`  ⚠️  Tabla 'usuarios' no existe en ${dbFile} - Saltando...`);
        continue;
      }

      // Obtener todos los usuarios
      const usuarios = db.prepare('SELECT id, username, password FROM usuarios').all();

      if (usuarios.length === 0) {
        console.log(`  ℹ️  No hay usuarios en ${dbFile}`);
        continue;
      }

      console.log(`  👥 Usuarios encontrados: ${usuarios.length}\n`);

      for (const usuario of usuarios) {
        try {
          // Verificar si la contraseña ya está hasheada con bcrypt
          if (isBcryptHash(usuario.password)) {
            console.log(`  ✓ ${usuario.username.padEnd(20)} - Ya tiene hash bcrypt`);
            totalYaBcrypt++;
            continue;
          }

          // Determinar contraseña temporal según usuario
          let nuevaPassword = 'Temporal123!';

          // Contraseñas específicas para usuarios conocidos
          if (usuario.username === 'admin') {
            nuevaPassword = 'Admin123!';
          } else if (usuario.username === 'user') {
            nuevaPassword = 'User123!';
          } else if (usuario.username === 'gerente') {
            nuevaPassword = 'Gerente123!';
          }

          // Hashear con bcrypt
          const hashedPassword = await hashPassword(nuevaPassword);

          // Actualizar en BD y marcar que debe cambiar contraseña
          db.prepare(
            `
            UPDATE usuarios 
            SET password = ?, debe_cambiar_password = 1 
            WHERE id = ?
          `
          ).run(hashedPassword, usuario.id);

          console.log(
            `  ✓ ${usuario.username.padEnd(20)} - Migrado (debe cambiar en primer login)`
          );
          totalMigrados++;
        } catch (userError) {
          console.error(`  ❌ ${usuario.username.padEnd(20)} - Error: ${userError.message}`);
          totalErrores++;
        }
      }

      console.log(`\n  ✅ ${dbFile} completado`);
    } catch (error) {
      console.error(`\n  ❌ Error procesando ${dbFile}:`, error.message);
      totalErrores++;
    } finally {
      if (db) {
        db.close();
      }
    }
  }

  // Resumen final
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 MIGRACIÓN COMPLETADA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Resumen:');
  console.log(`  • Contraseñas migradas:        ${totalMigrados}`);
  console.log(`  • Ya tenían bcrypt:            ${totalYaBcrypt}`);
  console.log(`  • Errores:                     ${totalErrores}`);
  console.log(`  • Total procesado:             ${totalMigrados + totalYaBcrypt + totalErrores}\n`);

  if (totalMigrados > 0) {
    console.log('⚠️  IMPORTANTE - CREDENCIALES TEMPORALES:\n');
    console.log('  Usuario        Contraseña Temporal');
    console.log('  ──────────     ────────────────────');
    console.log('  admin          Admin123!');
    console.log('  user           User123!');
    console.log('  gerente        Gerente123!');
    console.log('  otros          Temporal123!\n');
    console.log('  ⚡ Todos los usuarios DEBEN cambiar su contraseña en el primer login\n');
  }

  if (totalErrores > 0) {
    console.log(`⚠️  Se encontraron ${totalErrores} errores durante la migración`);
    console.log('   Revisa los mensajes anteriores para más detalles\n');
    process.exit(1);
  }

  console.log('✅ Migración exitosa - El sistema está listo para usar\n');
}

// Ejecutar migración
if (require.main === module) {
  migratePasswords()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal en migración:', error);
      process.exit(1);
    });
}

module.exports = { migratePasswords };
