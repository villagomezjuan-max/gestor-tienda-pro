/**
 * Constructor de queries SQL dinámico
 * Simplifica la construcción de queries con filtros, ordenamiento y paginación
 */

class QueryBuilder {
  constructor(db, table) {
    // Permitir que db sea opcional (para solo construir queries sin ejecutar)
    if (typeof db === 'string') {
      // Si solo se pasa un argumento string, es el nombre de la tabla
      this.table = db;
      this.db = null;
    } else {
      // Si se pasan dos argumentos, el primero es la BD
      this.db = db;
      this.table = table;
    }
    this.selectFields = ['*'];
    this.conditions = [];
    this.params = {};
    this.joins = [];
    this.orderByClause = '';
    this.limitClause = '';
    this.offsetClause = '';
    this.groupByClause = '';
  }

  /**
   * Especifica los campos a seleccionar
   * @param {Array<string>|string} fields - Campos a seleccionar
   * @returns {QueryBuilder} - this para encadenamiento
   */
  select(...fields) {
    if (fields.length === 0) {
      this.selectFields = ['*'];
    } else if (Array.isArray(fields[0])) {
      this.selectFields = fields[0];
    } else {
      this.selectFields = fields;
    }
    return this;
  }

  /**
   * Agrega una condición WHERE con operador
   * @param {string} field - Campo
   * @param {string} operator - Operador (=, >, <, !=, etc.)
   * @param {*} value - Valor
   * @returns {QueryBuilder} - this para encadenamiento
   */
  where(field, operator, value) {
    const paramKey = `param_${Object.keys(this.params).length}`;
    this.conditions.push(`${field} ${operator} @${paramKey}`);
    this.params[paramKey] = value;
    return this;
  }

  /**
   * Agrega una condición WHERE con igualdad
   * @param {string} field - Campo
   * @param {*} value - Valor
   * @returns {QueryBuilder} - this para encadenamiento
   */
  whereEquals(field, value) {
    return this.where(field, '=', value);
  }

  /**
   * Agrega una condición LIKE
   * @param {string} field - Campo
   * @param {string} value - Valor a buscar
   * @returns {QueryBuilder} - this para encadenamiento
   */
  whereLike(field, value) {
    const paramKey = `param_${Object.keys(this.params).length}`;
    this.conditions.push(`LOWER(${field}) LIKE @${paramKey}`);
    this.params[paramKey] = `%${value.toLowerCase()}%`;
    return this;
  }

  /**
   * Agrega una condición WHERE IN
   * @param {string} field - Campo
   * @param {Array} values - Array de valores
   * @returns {QueryBuilder} - this para encadenamiento
   */
  whereIn(field, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this;
    }

    const placeholders = values.map((_, index) => {
      const paramKey = `param_${Object.keys(this.params).length}`;
      this.params[paramKey] = values[index];
      return `@${paramKey}`;
    });

    this.conditions.push(`${field} IN (${placeholders.join(', ')})`);
    return this;
  }

  /**
   * Agrega múltiples condiciones de búsqueda (OR)
   * @param {Array<string>} fields - Campos a buscar
   * @param {string} searchTerm - Término de búsqueda
   * @returns {QueryBuilder} - this para encadenamiento
   */
  search(fields, searchTerm) {
    if (!searchTerm || !fields.length) {
      return this;
    }

    const paramKey = `search_${Object.keys(this.params).length}`;
    const searchConditions = fields.map((field) => `LOWER(${field}) LIKE @${paramKey}`);
    this.conditions.push(`(${searchConditions.join(' OR ')})`);
    this.params[paramKey] = `%${searchTerm.toLowerCase()}%`;
    return this;
  }

  /**
   * Agrega un JOIN
   * @param {string} type - Tipo de JOIN (INNER, LEFT, RIGHT)
   * @param {string} table - Tabla a unir
   * @param {string} condition - Condición de unión
   * @returns {QueryBuilder} - this para encadenamiento
   */
  join(type, table, condition) {
    this.joins.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  /**
   * Agrega un LEFT JOIN
   * @param {string} table - Tabla a unir
   * @param {string} condition - Condición de unión
   * @returns {QueryBuilder} - this para encadenamiento
   */
  leftJoin(table, condition) {
    return this.join('LEFT', table, condition);
  }

  /**
   * Agrega un INNER JOIN
   * @param {string} table - Tabla a unir
   * @param {string} condition - Condición de unión
   * @returns {QueryBuilder} - this para encadenamiento
   */
  innerJoin(table, condition) {
    return this.join('INNER', table, condition);
  }

  /**
   * Agrega GROUP BY
   * @param {...string} fields - Campos para agrupar
   * @returns {QueryBuilder} - this para encadenamiento
   */
  groupBy(...fields) {
    this.groupByClause = `GROUP BY ${fields.join(', ')}`;
    return this;
  }

  /**
   * Agrega ORDER BY
   * @param {string} field - Campo para ordenar
   * @param {string} direction - Dirección (ASC o DESC)
   * @returns {QueryBuilder} - this para encadenamiento
   */
  orderBy(field, direction = 'ASC') {
    const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${field} ${dir}`;
    return this;
  }

  /**
   * Agrega LIMIT
   * @param {number} n - Número de registros
   * @returns {QueryBuilder} - this para encadenamiento
   */
  limit(n) {
    if (Number.isFinite(n) && n > 0) {
      this.limitClause = `LIMIT ${Math.min(Math.max(n, 1), 1000)}`;
    }
    return this;
  }

  /**
   * Agrega OFFSET
   * @param {number} n - Número de registros a saltar
   * @returns {QueryBuilder} - this para encadenamiento
   */
  offset(n) {
    if (Number.isFinite(n) && n > 0) {
      this.offsetClause = `OFFSET ${n}`;
    }
    return this;
  }

  /**
   * Construye la query final
   * @returns {object} - {query: string, params: Object}
   */
  build() {
    const selectClause = `SELECT ${this.selectFields.join(', ')}`;
    const fromClause = `FROM ${this.table}`;
    const joinsClause = this.joins.join(' ');
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';

    const parts = [
      selectClause,
      fromClause,
      joinsClause,
      whereClause,
      this.groupByClause,
      this.orderByClause,
      this.limitClause,
      this.offsetClause,
    ].filter(Boolean);

    return {
      query: parts.join(' '),
      params: this.params,
    };
  }

  /**
   * Construye una query COUNT
   * @returns {object} - {query: string, params: Object}
   */
  buildCount() {
    const fromClause = `FROM ${this.table}`;
    const joinsClause = this.joins.join(' ');
    const whereClause = this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';

    const parts = ['SELECT COUNT(*) as count', fromClause, joinsClause, whereClause].filter(
      Boolean
    );

    return {
      query: parts.join(' '),
      params: this.params,
    };
  }

  /**
   * Ejecuta la query en una base de datos
   * @param {object} db - Instancia de base de datos (better-sqlite3)
   * @returns {Array} - Resultados
   */
  execute(db) {
    const { query, params } = this.build();
    return db.prepare(query).all(params);
  }

  /**
   * Ejecuta la query y retorna un solo registro
   * @param {object} db - Instancia de base de datos
   * @returns {object | null} - Primer resultado o null
   */
  executeOne(db) {
    const { query, params } = this.build();
    return db.prepare(query).get(params) || null;
  }

  /**
   * Ejecuta query COUNT
   * @param {object} db - Instancia de base de datos
   * @returns {number} - Total de registros
   */
  executeCount(db) {
    const { query, params } = this.buildCount();
    const result = db.prepare(query).get(params);
    return result?.count || 0;
  }
}

/**
 * Factory function para crear un QueryBuilder
 * @param {string} table - Nombre de la tabla
 * @returns {QueryBuilder}
 */
function query(table) {
  return new QueryBuilder(table);
}

module.exports = QueryBuilder;
module.exports.QueryBuilder = QueryBuilder;
module.exports.query = query;
