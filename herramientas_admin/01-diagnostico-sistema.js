#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════
 * 🔍 HERRAMIENTA 1: DIAGNÓSTICO COMPLETO DEL SISTEMA
 * ═══════════════════════════════════════════════════════════
 *
 * Analiza todo el sistema multi-tenant:
 * - Jerarquía de usuarios
 * - Conexiones de bases de datos
 * - Integridad de datos
 * - Problemas críticos
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const MASTER_DB = path.join(__dirname, '..', 'backend', 'data', 'gestor_tienda.db');
const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA MULTI-TENANT');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════\n');

const masterDb = new Database(MASTER_DB);
let errores = [];
let advertencias = [];
let estadisticas = {};

try {
  // 1. USUARIOS
  console.log('📊 1. ANÁLISIS DE USUARIOS\n');

  const usuarios = masterDb
    .prepare(
      `
    SELECT id, username, nombre, rol, negocio_principal, activo 
    FROM usuarios 
  `
    )
    .all();

  const usuariosHuerfanos = usuarios.filter((u) => {
    if (u.rol === 'super_admin') return false;
    const asignaciones = masterDb
      .prepare(
        `
      SELECT COUNT(*) as count FROM usuarios_negocios WHERE usuario_id = ?
    `
      )
      .get(u.id);
    return asignaciones.count === 0;
  });

  estadisticas.usuarios = {
    total: usuarios.length,
    super_admin: usuarios.filter((u) => u.rol === 'super_admin').length,
    admin: usuarios.filter((u) => u.rol === 'admin').length,
    vendedor: usuarios.filter((u) => u.rol === 'vendedor').length,
    activos: usuarios.filter((u) => u.activo).length,
    huerfanos: usuariosHuerfanos.length,
  };

  if (usuariosHuerfanos.length > 0) {
    errores.push({
      tipo: 'USUARIOS_HUERFANOS',
      severidad: 'CRÍTICA',
      cantidad: usuariosHuerfanos.length,
      usuarios: usuariosHuerfanos.map((u) => u.username),
    });
    console.log(`\x1b[31m❌ ${usuariosHuerfanos.length} usuarios huérfanos\x1b[0m`);
  } else {
    console.log('\x1b[32m✅ No hay usuarios huérfanos\x1b[0m');
  }

  console.log(`   Total usuarios: ${estadisticas.usuarios.total}`);
  console.log(`   Activos: ${estadisticas.usuarios.activos}\n`);

  // 2. NEGOCIOS
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏪 2. ANÁLISIS DE NEGOCIOS\n');

  const negocios = masterDb
    .prepare(
      `
    SELECT id, nombre, tipo, estado FROM negocios
  `
    )
    .all();

  estadisticas.negocios = {
    total: negocios.length,
    activos: negocios.filter((n) => n.estado === 'activo').length,
    conDB: 0,
    sinDB: 0,
    sinUsuarios: 0,
  };

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    const existe = fs.existsSync(dbFile);

    if (existe) {
      estadisticas.negocios.conDB++;
      console.log(`\x1b[32m✅\x1b[0m ${negocio.nombre}`);
    } else {
      estadisticas.negocios.sinDB++;
      errores.push({
        tipo: 'DB_FALTANTE',
        severidad: 'CRÍTICA',
        negocio: negocio.nombre,
        negocio_id: negocio.id,
      });
      console.log(`\x1b[31m❌\x1b[0m ${negocio.nombre} - DB NO EXISTE`);
    }

    const usuariosNegocio = masterDb
      .prepare(
        `
      SELECT COUNT(*) as count FROM usuarios_negocios WHERE negocio_id = ?
    `
      )
      .get(negocio.id);

    if (usuariosNegocio.count === 0 && negocio.id !== 'super_admin') {
      estadisticas.negocios.sinUsuarios++;
      advertencias.push({
        tipo: 'NEGOCIO_SIN_USUARIOS',
        negocio: negocio.nombre,
      });
    }
  });

  console.log(`\n   Total negocios: ${estadisticas.negocios.total}`);
  console.log(`   Con DB: ${estadisticas.negocios.conDB}`);
  console.log(`   Sin usuarios: ${estadisticas.negocios.sinUsuarios}\n`);

  // 3. PRODUCTOS Y STOCK
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📦 3. ANÁLISIS DE PRODUCTOS Y STOCK\n');

  estadisticas.productos = {
    total: 0,
    conStock: 0,
    sinStock: 0,
  };

  negocios.forEach((negocio) => {
    const dbFile = path.join(DATA_DIR, `${negocio.id}.db`);
    if (!fs.existsSync(dbFile)) return;

    try {
      const tenantDb = new Database(dbFile);
      const productos = tenantDb
        .prepare(
          `
        SELECT COUNT(*) as total,
               SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as con_stock
        FROM productos
      `
        )
        .get();

      estadisticas.productos.total += productos.total || 0;
      estadisticas.productos.conStock += productos.con_stock || 0;
      estadisticas.productos.sinStock += (productos.total || 0) - (productos.con_stock || 0);

      console.log(
        `   ${negocio.nombre}: ${productos.total} productos (${productos.con_stock || 0} con stock)`
      );

      tenantDb.close();
    } catch (error) {
      console.log(`   \x1b[31m❌ Error en ${negocio.nombre}\x1b[0m`);
    }
  });

  console.log(`\n   Total productos: ${estadisticas.productos.total}`);
  console.log(`   Con stock: ${estadisticas.productos.conStock}`);
  console.log(`   Sin stock: ${estadisticas.productos.sinStock}\n`);

  // RESUMEN FINAL
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 RESUMEN DEL DIAGNÓSTICO\n');

  console.log(`\x1b[31m🔴 ERRORES CRÍTICOS: ${errores.length}\x1b[0m`);
  if (errores.length > 0) {
    errores.forEach((error, i) => {
      console.log(`\n${i + 1}. [${error.severidad}] ${error.tipo}`);
      if (error.usuarios) console.log(`   Usuarios: ${error.usuarios.join(', ')}`);
      if (error.negocio) console.log(`   Negocio: ${error.negocio}`);
    });
  }

  console.log(`\n\x1b[33m🟡 ADVERTENCIAS: ${advertencias.length}\x1b[0m`);
  if (advertencias.length > 0) {
    advertencias.forEach((adv, i) => {
      console.log(`${i + 1}. ${adv.tipo} - ${adv.negocio || ''}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  if (errores.length === 0 && advertencias.length === 0) {
    console.log('\x1b[32m✅ SISTEMA EN PERFECTO ESTADO\x1b[0m');
  } else if (errores.length === 0) {
    console.log('\x1b[33m⚠️  SISTEMA FUNCIONAL CON ADVERTENCIAS\x1b[0m');
  } else {
    console.log('\x1b[31m❌ SISTEMA CON ERRORES CRÍTICOS - REQUIERE ATENCIÓN\x1b[0m');
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  // Guardar reporte JSON
  const reporte = {
    fecha: new Date().toISOString(),
    estadisticas,
    errores,
    advertencias,
  };

  const reporteFile = path.join(__dirname, 'ultimo-diagnostico.json');
  fs.writeFileSync(reporteFile, JSON.stringify(reporte, null, 2));
  console.log(`📄 Reporte guardado en: ultimo-diagnostico.json\n`);
} catch (error) {
  console.error('\n\x1b[31m❌ ERROR FATAL:\x1b[0m', error.message);
  process.exit(1);
} finally {
  masterDb.close();
}
