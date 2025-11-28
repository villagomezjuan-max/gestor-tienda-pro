#!/usr/bin/env node

/**
 * Script para crear el negocio "Admin Taller.SA" - Entorno de pruebas y desarrollo
 * Este negocio actúa como una tienda independiente para testing de mejoras y actualizaciones
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const NEGOCIO_ID = 'admin_taller.sa';
const NEGOCIO_NOMBRE = 'Admin Taller.SA - Desarrollo';

function generateId() {
  return `usr_${crypto.randomBytes(8).toString('hex')}`;
}

async function crearAdminTallerSA() {
  console.log('='.repeat(60));
  console.log('📦 Creando negocio Admin Taller.SA - Entorno de Desarrollo');
  console.log('='.repeat(60));

  try {
    const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');

    if (!fs.existsSync(dbPath)) {
      console.error('❌ Base de datos no encontrada');
      process.exit(1);
    }

    const db = new Database(dbPath);

    const existente = db.prepare('SELECT id FROM negocios WHERE id = ?').get(NEGOCIO_ID);

    if (existente) {
      console.log('⚠️  El negocio Admin Taller.SA ya existe, actualizando configuración...');
      db.prepare(
        `
        UPDATE negocios
        SET
          nombre = ?,
          tipo = ?,
          plan = ?,
          estado = 'activo'
        WHERE id = ?
      `
      ).run(NEGOCIO_NOMBRE, 'personalizado', 'enterprise', NEGOCIO_ID);
      console.log('✅ Negocio Admin Taller.SA actualizado correctamente');
    } else {
      db.prepare(
        `
        INSERT INTO negocios (
          id,
          nombre,
          tipo,
          plan,
          estado,
          usuarios_max,
          productos_max,
          fecha_creacion
        ) VALUES (?, ?, ?, ?, 'activo', 999, 999999, CURRENT_TIMESTAMP)
      `
      ).run(NEGOCIO_ID, NEGOCIO_NOMBRE, 'personalizado', 'enterprise');
      console.log('✅ Negocio Admin Taller.SA creado correctamente');
    }

    const passwordHash = await bcrypt.hash('DevAdmin2024!', 10);
    const usuarioExistente = db
      .prepare('SELECT id FROM usuarios WHERE username = ?')
      .get('developer');

    if (usuarioExistente) {
      db.prepare(
        `
        UPDATE usuarios
        SET
          password = ?,
          email = ?,
          rol = ?,
          activo = 1
        WHERE username = ?
      `
      ).run(passwordHash, 'developer@admin-taller.sa.local', 'admin', 'developer');
      console.log('✅ Usuario "developer" actualizado');
    } else {
      const userId = generateId();
      db.prepare(
        `
        INSERT INTO usuarios (id, username, password, email, rol, activo)
        VALUES (?, ?, ?, ?, ?, 1)
      `
      ).run(userId, 'developer', passwordHash, 'developer@admin-taller.sa.local', 'admin');
      db.prepare(
        `
        INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio)
        VALUES (?, ?, ?)
      `
      ).run(userId, NEGOCIO_ID, 'admin');
      console.log('✅ Usuario "developer" creado y asignado al negocio');
    }

    const adminUser = db.prepare('SELECT id FROM usuarios WHERE username = ?').get('admin');
    if (adminUser) {
      const tieneAcceso = db
        .prepare(
          `
        SELECT 1 FROM usuarios_negocios
        WHERE usuario_id = ? AND negocio_id = ?
      `
        )
        .get(adminUser.id, NEGOCIO_ID);

      if (!tieneAcceso) {
        db.prepare(
          `
          INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio)
          VALUES (?, ?, ?)
        `
        ).run(adminUser.id, NEGOCIO_ID, 'admin');
        console.log('✅ Usuario "admin" asignado al negocio Admin Taller.SA');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN TALLER.SA CONFIGURADO CORRECTAMENTE');
    console.log('='.repeat(60));
    console.log('\n📋 Información de acceso:');
    console.log(`   Negocio ID: ${NEGOCIO_ID}`);
    console.log('   Usuario: developer');
    console.log('   Contraseña: DevAdmin2024!');
    console.log('\n💡 Este entorno es ideal para:');
    console.log('   • Probar nuevas funcionalidades');
    console.log('   • Desarrollo de características');
    console.log('   • Testing de mejoras');
    console.log('   • Simulación de escenarios complejos');
    console.log('   • Depuración sin afectar datos reales');
    console.log('\n');
  } catch (error) {
    console.error('❌ Error al crear Admin Taller.SA:', error);
    process.exit(1);
  }
}

crearAdminTallerSA()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
