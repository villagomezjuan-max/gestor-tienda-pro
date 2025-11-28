/**
 * Utilidades para manejo de negocios (multi-tenant)
 */

/**
 * Obtener todos los negocios asignados a un usuario
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 * @returns {Array} Lista de negocios con sus roles
 */
function getUserNegocios(db, userId) {
  try {
    const query = `
      SELECT 
        n.id,
        n.nombre,
        n.tipo,
        n.estado,
        un.rol_en_negocio,
        un.es_negocio_principal
      FROM usuarios_negocios un
      JOIN negocios n ON n.id = un.negocio_id
      WHERE un.usuario_id = ?
      AND n.estado = 'activo'
      ORDER BY un.es_negocio_principal DESC, n.nombre ASC
    `;

    const negocios = db.prepare(query).all(userId);
    return negocios;
  } catch (error) {
    console.error('❌ Error obteniendo negocios del usuario:', error);
    return [];
  }
}

/**
 * Obtener lista de IDs de negocios del usuario (para token JWT)
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 * @returns {Array<string>} Lista de IDs de negocios
 */
function getUserNegociosIds(db, userId) {
  try {
    const negocios = getUserNegocios(db, userId);
    return negocios.map((n) => n.id);
  } catch (error) {
    console.error('❌ Error obteniendo IDs de negocios:', error);
    return ['mecanica']; // Fallback al negocio por defecto
  }
}

/**
 * Obtener el negocio principal del usuario
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 * @returns {object | null} Datos del negocio principal
 */
function getUserNegocioPrincipal(db, userId) {
  try {
    const query = `
      SELECT 
        n.id,
        n.nombre,
        n.tipo,
        n.estado,
        un.rol_en_negocio
      FROM usuarios_negocios un
      JOIN negocios n ON n.id = un.negocio_id
      WHERE un.usuario_id = ?
      AND un.es_negocio_principal = 1
      AND n.estado = 'activo'
      LIMIT 1
    `;

    return db.prepare(query).get(userId) || null;
  } catch (error) {
    console.error('❌ Error obteniendo negocio principal:', error);
    return null;
  }
}

/**
 * Verificar si un usuario tiene acceso a un negocio
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 * @param {string} negocioId - ID del negocio
 * @returns {boolean} true si tiene acceso, false si no
 */
function userHasAccessToNegocio(db, userId, negocioId) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM usuarios_negocios un
      JOIN negocios n ON n.id = un.negocio_id
      WHERE un.usuario_id = ?
      AND un.negocio_id = ?
      AND n.estado = 'activo'
    `;

    const result = db.prepare(query).get(userId, negocioId);
    return result && result.count > 0;
  } catch (error) {
    console.error('❌ Error verificando acceso a negocio:', error);
    return false;
  }
}

/**
 * Asignar un usuario a un negocio
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 * @param {string} negocioId - ID del negocio
 * @param {string} rol - Rol en el negocio (admin, gerente, user, etc.)
 * @param {boolean} esPrincipal - Si es el negocio principal del usuario
 * @returns {boolean} true si se asignó exitosamente
 */
function assignUserToNegocio(db, userId, negocioId, rol = 'user', esPrincipal = false) {
  try {
    // Verificar que el negocio existe y está activo
    const negocio = db.prepare('SELECT id, estado FROM negocios WHERE id = ?').get(negocioId);

    if (!negocio) {
      throw new Error(`Negocio no encontrado: ${negocioId}`);
    }

    if (negocio.estado !== 'activo') {
      throw new Error(`Negocio no está activo: ${negocioId}`);
    }

    // Si es negocio principal, quitar flag de otros negocios del usuario
    if (esPrincipal) {
      db.prepare(
        `
        UPDATE usuarios_negocios 
        SET es_negocio_principal = 0 
        WHERE usuario_id = ?
      `
      ).run(userId);
    }

    // Insertar o actualizar asignación
    db.prepare(
      `
      INSERT INTO usuarios_negocios (usuario_id, negocio_id, rol_en_negocio, es_negocio_principal)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(usuario_id, negocio_id) 
      DO UPDATE SET 
        rol_en_negocio = excluded.rol_en_negocio,
        es_negocio_principal = excluded.es_negocio_principal
    `
    ).run(userId, negocioId, rol, esPrincipal ? 1 : 0);

    // Actualizar columna de usuario para compatibilidad
    updateUserNegociosColumn(db, userId);

    // Registrar en auditoría
    db.prepare(
      `
      INSERT INTO auditoria_negocios (usuario_id, negocio_id, accion, detalles)
      VALUES (?, ?, 'asignado', ?)
    `
    ).run(userId, negocioId, JSON.stringify({ rol, esPrincipal }));

    console.log(`✅ Usuario ${userId} asignado a negocio ${negocioId} con rol ${rol}`);
    return true;
  } catch (error) {
    console.error('❌ Error asignando usuario a negocio:', error);
    return false;
  }
}

/**
 * Remover un usuario de un negocio
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 * @param {string} negocioId - ID del negocio
 * @returns {boolean} true si se removió exitosamente
 */
function removeUserFromNegocio(db, userId, negocioId) {
  try {
    // Verificar que el usuario tenga al menos 2 negocios asignados
    const count = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM usuarios_negocios 
      WHERE usuario_id = ?
    `
      )
      .get(userId);

    if (count.count <= 1) {
      throw new Error('No se puede remover el único negocio del usuario');
    }

    // Eliminar asignación
    db.prepare(
      `
      DELETE FROM usuarios_negocios 
      WHERE usuario_id = ? AND negocio_id = ?
    `
    ).run(userId, negocioId);

    // Si era el negocio principal, asignar otro como principal
    const principal = getUserNegocioPrincipal(db, userId);
    if (!principal) {
      const primerNegocio = getUserNegocios(db, userId)[0];
      if (primerNegocio) {
        db.prepare(
          `
          UPDATE usuarios_negocios 
          SET es_negocio_principal = 1 
          WHERE usuario_id = ? AND negocio_id = ?
        `
        ).run(userId, primerNegocio.id);
      }
    }

    // Actualizar columna de usuario
    updateUserNegociosColumn(db, userId);

    // Registrar en auditoría
    db.prepare(
      `
      INSERT INTO auditoria_negocios (usuario_id, negocio_id, accion)
      VALUES (?, ?, 'removido')
    `
    ).run(userId, negocioId);

    console.log(`✅ Usuario ${userId} removido de negocio ${negocioId}`);
    return true;
  } catch (error) {
    console.error('❌ Error removiendo usuario de negocio:', error);
    return false;
  }
}

/**
 * Actualizar la columna 'negocios' del usuario (JSON) para compatibilidad
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} userId - ID del usuario
 */
function updateUserNegociosColumn(db, userId) {
  try {
    const negociosIds = getUserNegociosIds(db, userId);
    const principal = getUserNegocioPrincipal(db, userId);

    db.prepare(
      `
      UPDATE usuarios 
      SET 
        negocios = ?,
        negocio_principal = ?
      WHERE id = ?
    `
    ).run(JSON.stringify(negociosIds), principal?.id || negociosIds[0] || 'mecanica', userId);
  } catch (error) {
    console.error('❌ Error actualizando columna negocios:', error);
  }
}

/**
 * Crear un nuevo negocio
 *
 * @param {object} db - Instancia de base de datos
 * @param {object} data - Datos del negocio
 * @returns {object | null} Negocio creado o null si falla
 */
function createNegocio(db, data) {
  try {
    const id = data.id || `negocio_${Date.now()}`;
    const nombre = data.nombre;
    const tipo = data.tipo || 'general';

    if (!nombre) {
      throw new Error('El nombre del negocio es obligatorio');
    }

    db.prepare(
      `
      INSERT INTO negocios (
        id, nombre, tipo, estado, plan, usuarios_max, productos_max, 
        icono, descripcion, modulos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      nombre,
      tipo,
      'activo',
      data.plan || 'basico',
      data.usuarios_max || 3,
      data.productos_max || 500,
      data.icono || 'fas fa-store',
      data.descripcion || '',
      JSON.stringify(data.modulos || ['ventas', 'productos', 'clientes', 'inventario'])
    );

    console.log(`✅ Negocio creado: ${nombre} (${id})`);

    return db.prepare('SELECT * FROM negocios WHERE id = ?').get(id);
  } catch (error) {
    console.error('❌ Error creando negocio:', error);
    return null;
  }
}

/**
 * Verificar límites del plan del negocio
 *
 * @param {object} db - Instancia de base de datos
 * @param {string} negocioId - ID del negocio
 * @returns {object} Estado de los límites
 */
function checkNegocioLimits(db, negocioId) {
  try {
    const negocio = db
      .prepare(
        `
      SELECT n.*, p.usuarios_max, p.productos_max, p.storage_max_mb
      FROM negocios n
      LEFT JOIN planes_subscripcion p ON p.id = n.plan
      WHERE n.id = ?
    `
      )
      .get(negocioId);

    if (!negocio) {
      return { valid: false, error: 'Negocio no encontrado' };
    }

    if (negocio.estado !== 'activo') {
      return { valid: false, error: 'Negocio inactivo o suspendido' };
    }

    // Contar usuarios actuales
    const usuariosActuales = db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM usuarios_negocios 
      WHERE negocio_id = ?
    `
      )
      .get(negocioId).count;

    // Contar productos actuales (si la tabla existe)
    let productosActuales = 0;
    try {
      productosActuales = db
        .prepare(
          `
        SELECT COUNT(*) as count 
        FROM productos
      `
        )
        .get().count;
    } catch (error) {
      // Tabla productos no existe o error
    }

    return {
      valid: true,
      usuarios: {
        actual: usuariosActuales,
        max: negocio.usuarios_max || Infinity,
        disponible: (negocio.usuarios_max || Infinity) - usuariosActuales,
      },
      productos: {
        actual: productosActuales,
        max: negocio.productos_max || Infinity,
        disponible: (negocio.productos_max || Infinity) - productosActuales,
      },
      plan: negocio.plan,
      estado: negocio.estado,
    };
  } catch (error) {
    console.error('❌ Error verificando límites:', error);
    return { valid: false, error: error.message };
  }
}

module.exports = {
  getUserNegocios,
  getUserNegociosIds,
  getUserNegocioPrincipal,
  userHasAccessToNegocio,
  assignUserToNegocio,
  removeUserFromNegocio,
  updateUserNegociosColumn,
  createNegocio,
  checkNegocioLimits,
};
