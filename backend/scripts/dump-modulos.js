const path = require('path');

const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'gestor_tienda.db');
const db = new Database(dbPath);

const rows = db.prepare('SELECT id, nombre, modulos FROM negocios ORDER BY id').all();

console.log(JSON.stringify(rows, null, 2));

db.close();
