// ============================================
// ENDPOINTS DE SUPER ADMIN - Herramientas Avanzadas
// Gestor Tienda Pro v2.0
// ============================================

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');
const express = require('express');

const { authenticate, requireRole } = require('../middleware/auth');
const { ROLE_SUPER_ADMIN } = require('../utils/roles');

const router = express.Router();

// Middleware: Solo super admin puede acceder
const requireSuperAdmin = [authenticate, requireRole(ROLE_SUPER_ADMIN)];

// ============================================
// OBTENER TODAS LAS BASES DE DATOS
// ============================================
router.get('/databases', requireSuperAdmin, (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    const databases = dbFiles.map((file) => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);

      let users = 0;
      let records = 0;
      let active = true;

      try {
        const db = new Database(filePath, { readonly: true });

        // Contar usuarios si la tabla existe
        const usersTable = db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
          .get();
        if (usersTable) {
          const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
          users = userCount.count;
        }

        // Contar registros totales (aproximado)
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables.forEach((table) => {
          try {
            const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
            records += count.count;
          } catch (e) {
            // Tabla sin acceso o sistema
          }
        });

        db.close();
      } catch (e) {
        console.error(`Error leyendo ${file}:`, e);
        active = false;
      }

      return {
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        users,
        records,
        active,
      };
    });

    res.json({
      success: true,
      databases,
      total: databases.length,
      totalSize: databases.reduce((sum, db) => sum + db.size, 0),
    });
  } catch (error) {
    console.error('Error obteniendo bases de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// OBTENER TODOS LOS USUARIOS DE TODAS LAS BDs
// ============================================
router.get('/users/all', requireSuperAdmin, (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    const allUsers = [];

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);

      try {
        const db = new Database(filePath, { readonly: true });

        // Verificar si existe la tabla usuarios
        const usersTable = db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
          .get();

        if (usersTable) {
          const users = db
            .prepare(
              `
                        SELECT 
                            id, 
                            username, 
                            nombre, 
                            email, 
                            rol, 
                            activo,
                            negocio_principal as negocio_id,
                            created_at,
                            updated_at
                        FROM usuarios
                    `
            )
            .all();

          users.forEach((user) => {
            allUsers.push({
              ...user,
              database: file,
              source_db: file.replace('.db', ''),
            });
          });
        }

        db.close();
      } catch (e) {
        console.error(`Error leyendo usuarios de ${file}:`, e);
      }
    });

    // Calcular estadísticas
    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((u) => u.activo).length,
      inactiveUsers: allUsers.filter((u) => !u.activo).length,
      orphanedUsers: allUsers.filter((u) => !u.negocio_id || u.negocio_id === 'undefined').length,
      byRole: allUsers.reduce((acc, user) => {
        acc[user.rol] = (acc[user.rol] || 0) + 1;
        return acc;
      }, {}),
      byDatabase: allUsers.reduce((acc, user) => {
        acc[user.database] = (acc[user.database] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      users: allUsers,
      stats,
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ESTADÍSTICAS GENERALES DEL SISTEMA
// ============================================
router.get('/statistics', requireSuperAdmin, (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    let stats = {
      totalDatabases: dbFiles.length,
      totalUsers: 0,
      totalProducts: 0,
      totalSales: 0,
      totalSize: 0,
      orphanedUsers: 0,
      inactiveUsers: 0,
      activeDatabases: 0,
    };

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);
      const fileStats = fs.statSync(filePath);
      stats.totalSize += fileStats.size;

      try {
        const db = new Database(filePath, { readonly: true });
        stats.activeDatabases++;

        // Usuarios
        try {
          const users = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
          stats.totalUsers += users.count;

          const inactive = db
            .prepare('SELECT COUNT(*) as count FROM usuarios WHERE activo = 0')
            .get();
          stats.inactiveUsers += inactive.count;

          const orphaned = db
            .prepare(
              "SELECT COUNT(*) as count FROM usuarios WHERE negocio_principal IS NULL OR negocio_principal = 'undefined'"
            )
            .get();
          stats.orphanedUsers += orphaned.count;
        } catch (e) {
          console.warn(`Error consultando usuarios en ${file}:`, e.message);
        }

        // Productos
        try {
          const products = db.prepare('SELECT COUNT(*) as count FROM productos').get();
          stats.totalProducts += products.count;
        } catch (e) {
          console.warn(`Error contando productos en ${file}:`, e.message);
        }

        // Ventas
        try {
          const sales = db.prepare('SELECT COUNT(*) as count FROM ventas').get();
          stats.totalSales += sales.count;
        } catch (e) {
          console.warn(`Error contando ventas en ${file}:`, e.message);
        }

        db.close();
      } catch (e) {
        console.error(`Error leyendo ${file}:`, e);
      }
    });

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// LIMPIAR USUARIOS HUÉRFANOS
// ============================================
router.post('/cleanup/orphaned-users', requireSuperAdmin, (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    let totalDeleted = 0;

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);

      try {
        const db = new Database(filePath);

        const result = db
          .prepare(
            `
                    DELETE FROM usuarios 
                    WHERE negocio_principal IS NULL 
                    OR negocio_principal = 'undefined'
                    OR negocio_principal = ''
                `
          )
          .run();

        totalDeleted += result.changes;
        db.close();
      } catch (e) {
        console.error(`Error limpiando ${file}:`, e);
      }
    });

    res.json({
      success: true,
      deleted: totalDeleted,
      message: `Se eliminaron ${totalDeleted} usuarios huérfanos`,
    });
  } catch (error) {
    console.error('Error limpiando usuarios huérfanos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DESACTIVAR USUARIOS INACTIVOS
// ============================================
router.post('/cleanup/inactive-users', requireSuperAdmin, (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    let totalDeactivated = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 días

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);

      try {
        const db = new Database(filePath);

        // Buscar columna last_login si existe
        const columns = db.prepare('PRAGMA table_info(usuarios)').all();
        const hasLastLogin = columns.some((col) => col.name === 'last_login');

        if (hasLastLogin) {
          const result = db
            .prepare(
              `
                        UPDATE usuarios 
                        SET activo = 0
                        WHERE activo = 1
                        AND (last_login IS NULL OR last_login < ?)
                        AND rol != 'super_admin'
                    `
            )
            .run(cutoffDate.toISOString());

          totalDeactivated += result.changes;
        }

        db.close();
      } catch (e) {
        console.error(`Error desactivando usuarios en ${file}:`, e);
      }
    });

    res.json({
      success: true,
      deactivated: totalDeactivated,
      message: `Se desactivaron ${totalDeactivated} usuarios inactivos`,
    });
  } catch (error) {
    console.error('Error desactivando usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// OPTIMIZAR BASES DE DATOS (MEJORADO)
// ============================================
router.post('/optimize/databases', requireSuperAdmin, (req, res) => {
  try {
    const { databases } = req.body;
    const dataDir = path.join(__dirname, '../data');

    // Si no se especifican BDs, optimizar todas
    const dbFiles =
      databases && Array.isArray(databases) && databases.length > 0
        ? databases
        : fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    let totalSpaceRecovered = 0;
    const results = [];

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);

      if (!fs.existsSync(filePath)) {
        results.push({ database: file, error: 'No encontrada' });
        return;
      }

      try {
        const statsBefore = fs.statSync(filePath);
        const db = new Database(filePath);

        // VACUUM recupera espacio
        db.prepare('VACUUM').run();

        // ANALYZE actualiza estadísticas
        db.prepare('ANALYZE').run();

        db.close();

        const statsAfter = fs.statSync(filePath);
        const spaceRecovered = statsBefore.size - statsAfter.size;
        totalSpaceRecovered += spaceRecovered;

        results.push({
          database: file,
          sizeBefore: statsBefore.size,
          sizeAfter: statsAfter.size,
          spaceRecovered: Math.max(0, spaceRecovered),
          success: true,
        });
      } catch (e) {
        console.error(`Error optimizando ${file}:`, e);
        results.push({ database: file, error: e.message, success: false });
      }
    });

    res.json({
      success: true,
      spaceRecovered: Math.max(0, totalSpaceRecovered),
      results,
      message: `Optimización completada. Espacio recuperado: ${(totalSpaceRecovered / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (error) {
    console.error('Error optimizando bases de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ANALIZAR INTEGRIDAD
// ============================================
router.get('/integrity/analyze', requireSuperAdmin, (req, res) => {
  try {
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    const issues = [];

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);

      try {
        const db = new Database(filePath, { readonly: true });

        // Verificar integridad
        const integrityCheck = db.prepare('PRAGMA integrity_check').all();

        if (integrityCheck.length > 1 || integrityCheck[0]?.integrity_check !== 'ok') {
          issues.push(`${file}: Problemas de integridad detectados`);
        }

        // Verificar claves foráneas
        const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
        if (fkCheck.length > 0) {
          issues.push(`${file}: ${fkCheck.length} violaciones de claves foráneas`);
        }

        db.close();
      } catch (e) {
        issues.push(`${file}: Error al verificar - ${e.message}`);
      }
    });

    res.json({
      success: true,
      healthy: issues.length === 0,
      issues,
      message:
        issues.length === 0 ? 'Sistema íntegro' : `Se encontraron ${issues.length} problemas`,
    });
  } catch (error) {
    console.error('Error analizando integridad:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ELIMINAR USUARIO
// ============================================
router.delete('/users/:userId', requireSuperAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const dataDir = path.join(__dirname, '../data');
    const dbFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    let deleted = false;

    dbFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);

      try {
        const db = new Database(filePath);
        const result = db.prepare('DELETE FROM usuarios WHERE id = ?').run(userId);

        if (result.changes > 0) {
          deleted = true;
        }

        db.close();
      } catch (e) {
        console.error(`Error eliminando usuario de ${file}:`, e);
      }
    });

    if (deleted) {
      res.json({ success: true, message: 'Usuario eliminado' });
    } else {
      res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ELIMINAR USUARIOS EN LOTE (MEJORADO)
// ============================================
router.post('/users/batch-delete', requireSuperAdmin, (req, res) => {
  try {
    const { users, userIds } = req.body;

    // Aceptar tanto el formato nuevo {id, db} como el antiguo [ids]
    let usersToDelete = [];

    if (Array.isArray(users)) {
      // Formato nuevo: [{id: 'x', db: 'y.db'}]
      usersToDelete = users;
    } else if (Array.isArray(userIds)) {
      // Formato antiguo: ['id1', 'id2']
      usersToDelete = userIds.map((id) => ({ id, db: null }));
    } else {
      return res.status(400).json({ success: false, error: 'Formato de datos inválido' });
    }

    if (usersToDelete.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay usuarios para eliminar' });
    }

    const dataDir = path.join(__dirname, '../data');
    let totalDeleted = 0;

    // Si se especifica la BD, solo buscar en esa
    const dbsToCheck =
      users && users[0]?.db
        ? [...new Set(users.map((u) => u.db))]
        : fs.readdirSync(dataDir).filter((f) => f.endsWith('.db'));

    dbsToCheck.forEach((dbFile) => {
      const filePath = path.join(dataDir, dbFile);

      if (!fs.existsSync(filePath)) return;

      try {
        const db = new Database(filePath);

        // Obtener IDs a eliminar de esta BD
        const idsForThisDb = usersToDelete.filter((u) => !u.db || u.db === dbFile).map((u) => u.id);

        if (idsForThisDb.length > 0) {
          const placeholders = idsForThisDb.map(() => '?').join(',');
          const result = db
            .prepare(`DELETE FROM usuarios WHERE id IN (${placeholders})`)
            .run(...idsForThisDb);
          totalDeleted += result.changes;
        }

        db.close();
      } catch (e) {
        console.error(`Error eliminando usuarios de ${dbFile}:`, e);
      }
    });

    res.json({
      success: true,
      deleted: totalDeleted,
      message: `Se eliminaron ${totalDeleted} usuarios`,
    });
  } catch (error) {
    console.error('Error eliminando usuarios en lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// EJECUTAR SQL (CON PRECAUCIÓN)
// ============================================
router.post('/sql/execute', requireSuperAdmin, (req, res) => {
  try {
    const { database, query } = req.body;

    if (!database || !query) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros' });
    }

    // Validar que no sean comandos peligrosos
    const dangerousCommands = ['DROP DATABASE', 'DROP TABLE', 'TRUNCATE'];
    const queryUpper = query.toUpperCase();

    if (dangerousCommands.some((cmd) => queryUpper.includes(cmd))) {
      return res.status(403).json({
        success: false,
        error: 'Comando no permitido por seguridad. Usa las herramientas específicas.',
      });
    }

    const dataDir = path.join(__dirname, '../data');
    const filePath = path.join(dataDir, database);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Base de datos no encontrada' });
    }

    const db = new Database(filePath, {
      readonly: query.trim().toUpperCase().startsWith('SELECT'),
    });

    let result;
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      result = db.prepare(query).all();
    } else {
      result = db.prepare(query).run();
    }

    db.close();

    res.json({ success: true, result });
  } catch (error) {
    console.error('Error ejecutando SQL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// BACKUP GLOBAL
// ============================================
router.post('/backup/all', requireSuperAdmin, (req, res) => {
  try {
    const archiver = require('archiver');
    const dataDir = path.join(__dirname, '../data');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=backup-completo-${Date.now()}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);
    archive.directory(dataDir, 'data');
    archive.finalize();
  } catch (error) {
    console.error('Error creando backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
