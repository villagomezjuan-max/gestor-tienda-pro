#!/usr/bin/env node
/**
 * Script para crear banco de datos extenso de repuestos automotrices
 * Incluye marcas, modelos, repuestos con información técnica detallada
 * Gestor Tienda Pro v2.0
 */

const fs = require('fs');
const path = require('path');

const Database = require('better-sqlite3');

// Ruta de la base de datos
const DB_PATH = process.env.DB_PATH || './data/gestor_tienda.db';

function generateId(prefix = 'id') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function seedCatalogoTecnico() {
  console.log('🚗 Creando banco de datos de repuestos automotrices...');

  try {
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const now = new Date().toISOString();

    // === MARCAS DE VEHÍCULOS ===
    console.log('🏭 Insertando marcas de vehículos...');
    const marcas = [
      { nombre: 'Toyota', pais_origen: 'Japón' },
      { nombre: 'Chevrolet', pais_origen: 'Estados Unidos' },
      { nombre: 'Nissan', pais_origen: 'Japón' },
      { nombre: 'Honda', pais_origen: 'Japón' },
      { nombre: 'Hyundai', pais_origen: 'Corea del Sur' },
      { nombre: 'Kia', pais_origen: 'Corea del Sur' },
      { nombre: 'Ford', pais_origen: 'Estados Unidos' },
      { nombre: 'Volkswagen', pais_origen: 'Alemania' },
      { nombre: 'Mazda', pais_origen: 'Japón' },
      { nombre: 'Mitsubishi', pais_origen: 'Japón' },
      { nombre: 'Suzuki', pais_origen: 'Japón' },
      { nombre: 'Subaru', pais_origen: 'Japón' },
      { nombre: 'Isuzu', pais_origen: 'Japón' },
      { nombre: 'Renault', pais_origen: 'Francia' },
      { nombre: 'Peugeot', pais_origen: 'Francia' },
    ];

    const insertMarca = db.prepare(`
      INSERT OR IGNORE INTO marcas_vehiculos (id, nombre, pais_origen, activo, created_at)
      VALUES (?, ?, ?, 1, ?)
    `);

    const marcaIds = {};
    marcas.forEach((marca) => {
      const id = generateId('marca');
      marcaIds[marca.nombre] = id;
      insertMarca.run(id, marca.nombre, marca.pais_origen, now);
    });

    // === MODELOS DE VEHÍCULOS ===
    console.log('🚘 Insertando modelos de vehículos...');
    const modelos = [
      // Toyota
      {
        marca: 'Toyota',
        nombre: 'Corolla',
        tipo: 'Sedán',
        anio_inicio: 2010,
        anio_fin: 2024,
        motor: '1.8L 4cyl',
      },
      {
        marca: 'Toyota',
        nombre: 'Camry',
        tipo: 'Sedán',
        anio_inicio: 2012,
        anio_fin: 2024,
        motor: '2.5L 4cyl',
      },
      {
        marca: 'Toyota',
        nombre: 'RAV4',
        tipo: 'SUV',
        anio_inicio: 2015,
        anio_fin: 2024,
        motor: '2.5L 4cyl',
      },
      {
        marca: 'Toyota',
        nombre: 'Hilux',
        tipo: 'Camioneta',
        anio_inicio: 2005,
        anio_fin: 2024,
        motor: '2.4L Diesel',
      },
      {
        marca: 'Toyota',
        nombre: 'Prado',
        tipo: 'SUV',
        anio_inicio: 2010,
        anio_fin: 2024,
        motor: '2.7L 4cyl',
      },

      // Chevrolet
      {
        marca: 'Chevrolet',
        nombre: 'Spark',
        tipo: 'Hatchback',
        anio_inicio: 2010,
        anio_fin: 2024,
        motor: '1.2L 4cyl',
      },
      {
        marca: 'Chevrolet',
        nombre: 'Aveo',
        tipo: 'Sedán',
        anio_inicio: 2012,
        anio_fin: 2020,
        motor: '1.6L 4cyl',
      },
      {
        marca: 'Chevrolet',
        nombre: 'Cruze',
        tipo: 'Sedán',
        anio_inicio: 2009,
        anio_fin: 2023,
        motor: '1.4L Turbo',
      },
      {
        marca: 'Chevrolet',
        nombre: 'Captiva',
        tipo: 'SUV',
        anio_inicio: 2011,
        anio_fin: 2018,
        motor: '2.2L Diesel',
      },
      {
        marca: 'Chevrolet',
        nombre: 'D-Max',
        tipo: 'Camioneta',
        anio_inicio: 2012,
        anio_fin: 2024,
        motor: '3.0L Diesel',
      },

      // Nissan
      {
        marca: 'Nissan',
        nombre: 'Versa',
        tipo: 'Sedán',
        anio_inicio: 2012,
        anio_fin: 2024,
        motor: '1.6L 4cyl',
      },
      {
        marca: 'Nissan',
        nombre: 'Sentra',
        tipo: 'Sedán',
        anio_inicio: 2013,
        anio_fin: 2024,
        motor: '1.8L 4cyl',
      },
      {
        marca: 'Nissan',
        nombre: 'X-Trail',
        tipo: 'SUV',
        anio_inicio: 2014,
        anio_fin: 2024,
        motor: '2.5L 4cyl',
      },
      {
        marca: 'Nissan',
        nombre: 'Frontier',
        tipo: 'Camioneta',
        anio_inicio: 2008,
        anio_fin: 2024,
        motor: '2.5L Diesel',
      },

      // Honda
      {
        marca: 'Honda',
        nombre: 'Civic',
        tipo: 'Sedán',
        anio_inicio: 2012,
        anio_fin: 2024,
        motor: '2.0L 4cyl',
      },
      {
        marca: 'Honda',
        nombre: 'Accord',
        tipo: 'Sedán',
        anio_inicio: 2013,
        anio_fin: 2024,
        motor: '2.4L 4cyl',
      },
      {
        marca: 'Honda',
        nombre: 'CR-V',
        tipo: 'SUV',
        anio_inicio: 2012,
        anio_fin: 2024,
        motor: '2.4L 4cyl',
      },
      {
        marca: 'Honda',
        nombre: 'Pilot',
        tipo: 'SUV',
        anio_inicio: 2016,
        anio_fin: 2024,
        motor: '3.5L V6',
      },

      // Hyundai
      {
        marca: 'Hyundai',
        nombre: 'Accent',
        tipo: 'Sedán',
        anio_inicio: 2011,
        anio_fin: 2024,
        motor: '1.6L 4cyl',
      },
      {
        marca: 'Hyundai',
        nombre: 'Elantra',
        tipo: 'Sedán',
        anio_inicio: 2011,
        anio_fin: 2024,
        motor: '2.0L 4cyl',
      },
      {
        marca: 'Hyundai',
        nombre: 'Tucson',
        tipo: 'SUV',
        anio_inicio: 2016,
        anio_fin: 2024,
        motor: '2.0L 4cyl',
      },
      {
        marca: 'Hyundai',
        nombre: 'Santa Fe',
        tipo: 'SUV',
        anio_inicio: 2013,
        anio_fin: 2024,
        motor: '2.4L 4cyl',
      },
    ];

    const insertModelo = db.prepare(`
      INSERT OR IGNORE INTO modelos_vehiculos (id, marca_id, nombre, tipo_vehiculo, anio_inicio, anio_fin, motor_defecto, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const modeloIds = {};
    modelos.forEach((modelo) => {
      const id = generateId('modelo');
      const key = `${modelo.marca}_${modelo.nombre}`;
      modeloIds[key] = id;
      insertModelo.run(
        id,
        marcaIds[modelo.marca],
        modelo.nombre,
        modelo.tipo,
        modelo.anio_inicio,
        modelo.anio_fin,
        modelo.motor,
        now
      );
    });

    // === CATEGORÍAS TÉCNICAS ===
    console.log('📂 Insertando categorías técnicas...');
    const categoriasTecnicas = [
      {
        nombre: 'Motor',
        descripcion: 'Componentes del sistema motor',
        codigo: '01',
        icono: 'engine',
      },
      {
        nombre: 'Filtros de Motor',
        descripcion: 'Filtros de aceite, aire y combustible',
        codigo: '01-01',
        padre: 'Motor',
      },
      {
        nombre: 'Aceites y Lubricantes',
        descripcion: 'Aceites de motor y transmisión',
        codigo: '01-02',
        padre: 'Motor',
      },
      {
        nombre: 'Bujías e Ignición',
        descripcion: 'Sistema de encendido',
        codigo: '01-03',
        padre: 'Motor',
      },

      {
        nombre: 'Transmisión',
        descripcion: 'Sistema de transmisión',
        codigo: '02',
        icono: 'gears',
      },
      {
        nombre: 'Aceites de Transmisión',
        descripcion: 'Lubricantes para transmisión',
        codigo: '02-01',
        padre: 'Transmisión',
      },
      {
        nombre: 'Embrague',
        descripcion: 'Componentes de embrague',
        codigo: '02-02',
        padre: 'Transmisión',
      },

      { nombre: 'Frenos', descripcion: 'Sistema de frenado', codigo: '03', icono: 'brake-disc' },
      {
        nombre: 'Pastillas de Freno',
        descripcion: 'Pastillas delanteras y traseras',
        codigo: '03-01',
        padre: 'Frenos',
      },
      {
        nombre: 'Discos de Freno',
        descripcion: 'Discos delanteros y traseros',
        codigo: '03-02',
        padre: 'Frenos',
      },
      {
        nombre: 'Líquidos de Freno',
        descripcion: 'Líquido hidráulico DOT',
        codigo: '03-03',
        padre: 'Frenos',
      },

      {
        nombre: 'Suspensión',
        descripcion: 'Sistema de suspensión',
        codigo: '04',
        icono: 'shock-absorber',
      },
      {
        nombre: 'Amortiguadores',
        descripcion: 'Amortiguadores delanteros y traseros',
        codigo: '04-01',
        padre: 'Suspensión',
      },
      {
        nombre: 'Resortes',
        descripcion: 'Resortes helicoidales',
        codigo: '04-02',
        padre: 'Suspensión',
      },

      { nombre: 'Neumáticos', descripcion: 'Llantas y neumáticos', codigo: '05', icono: 'tire' },
      {
        nombre: 'Neumáticos Radiales',
        descripcion: 'Neumáticos radiales',
        codigo: '05-01',
        padre: 'Neumáticos',
      },

      { nombre: 'Eléctrico', descripcion: 'Sistema eléctrico', codigo: '06', icono: 'battery' },
      {
        nombre: 'Baterías',
        descripcion: 'Baterías de arranque',
        codigo: '06-01',
        padre: 'Eléctrico',
      },
      {
        nombre: 'Alternadores',
        descripcion: 'Generadores de corriente',
        codigo: '06-02',
        padre: 'Eléctrico',
      },
    ];

    const insertCategoriaTecnica = db.prepare(`
      INSERT OR IGNORE INTO categorias_tecnicas (id, nombre, descripcion, codigo_sistema, icono, categoria_padre_id, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const categoriaIds = {};
    // Primero insertar categorías principales (sin padre)
    categoriasTecnicas
      .filter((cat) => !cat.padre)
      .forEach((cat, index) => {
        const id = generateId('cat');
        categoriaIds[cat.nombre] = id;
        insertCategoriaTecnica.run(
          id,
          cat.nombre,
          cat.descripcion,
          cat.codigo,
          cat.icono,
          null,
          now
        );
      });

    // Luego insertar subcategorías
    categoriasTecnicas
      .filter((cat) => cat.padre)
      .forEach((cat) => {
        const id = generateId('subcat');
        categoriaIds[cat.nombre] = id;
        const padreId = categoriaIds[cat.padre];
        insertCategoriaTecnica.run(
          id,
          cat.nombre,
          cat.descripcion,
          cat.codigo,
          cat.icono,
          padreId,
          now
        );
      });

    // === PRODUCTOS/REPUESTOS DETALLADOS ===
    console.log('📦 Insertando repuestos con información técnica...');

    const repuestos = [
      // ACEITES DE MOTOR
      {
        codigo: 'ACE-5W30-001',
        nombre: 'Aceite Motor Mobil 1 5W-30 Full Synthetic',
        descripcion: 'Aceite sintético para motores a gasolina y diésel ligero',
        categoria: 'Aceites y Lubricantes',
        precio_compra: 28.5,
        precio_venta: 42.0,
        stock: 45,
        especificaciones: {
          viscosidad: '5W-30',
          tipo_aceite: 'Sintético',
          normas_api: 'API SN/CF',
          normas_acea: 'ACEA A3/B4',
          capacidad: '4L',
          temperatura_operacion: '-30°C a +40°C',
        },
        numeros_parte: [{ numero: 'MOB1-5W30-4L', tipo: 'OEM', fabricante: 'Mobil' }],
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Corolla', anio_inicio: 2014, anio_fin: 2024 },
          { marca: 'Honda', modelo: 'Civic', anio_inicio: 2012, anio_fin: 2024 },
          { marca: 'Nissan', modelo: 'Sentra', anio_inicio: 2013, anio_fin: 2024 },
        ],
      },
      {
        codigo: 'ACE-20W50-002',
        nombre: 'Aceite Motor Castrol GTX 20W-50',
        descripcion: 'Aceite mineral para motores con alto kilometraje',
        categoria: 'Aceites y Lubricantes',
        precio_compra: 18.75,
        precio_venta: 28.0,
        stock: 60,
        especificaciones: {
          viscosidad: '20W-50',
          tipo_aceite: 'Mineral',
          normas_api: 'API SL/CF',
          capacidad: '4L',
          kilometraje_recomendado: '+100,000 km',
        },
        numeros_parte: [{ numero: 'CTX-20W50-4L', tipo: 'OEM', fabricante: 'Castrol' }],
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Hilux', anio_inicio: 2005, anio_fin: 2015 },
          { marca: 'Chevrolet', modelo: 'D-Max', anio_inicio: 2012, anio_fin: 2018 },
        ],
      },

      // FILTROS
      {
        codigo: 'FIL-ACE-001',
        nombre: 'Filtro Aceite Mann W 712/75',
        descripcion: 'Filtro de aceite de alta eficiencia',
        categoria: 'Filtros de Motor',
        precio_compra: 8.2,
        precio_venta: 12.5,
        stock: 120,
        especificaciones: {
          diametro_exterior: '93mm',
          diametro_interior: '62mm',
          altura: '96mm',
          rosca: 'M20x1.5',
          tipo_filtro: 'Spin-on',
          eficiencia: '99.5%',
        },
        numeros_parte: [
          { numero: 'W712/75', tipo: 'OEM', fabricante: 'Mann Filter' },
          { numero: '15208-65F0C', tipo: 'OEM', fabricante: 'Nissan' },
          { numero: '90915-YZZD4', tipo: 'OEM', fabricante: 'Toyota' },
        ],
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Corolla', anio_inicio: 2014, anio_fin: 2024, motor: '1.8L' },
          { marca: 'Nissan', modelo: 'Sentra', anio_inicio: 2013, anio_fin: 2024, motor: '1.8L' },
        ],
      },
      {
        codigo: 'FIL-AIRE-001',
        nombre: 'Filtro Aire K&N 33-2304',
        descripcion: 'Filtro de aire de alto flujo lavable',
        categoria: 'Filtros de Motor',
        precio_compra: 45.0,
        precio_venta: 68.0,
        stock: 25,
        especificaciones: {
          largo: '318mm',
          ancho: '235mm',
          altura: '25mm',
          tipo_filtro: 'Algodón oiled',
          flujo_aire: '+50% vs OEM',
          lavable: 'Sí',
          duracion: '1,600,000 km',
        },
        numeros_parte: [{ numero: '33-2304', tipo: 'Aftermarket', fabricante: 'K&N' }],
        compatibilidad: [
          { marca: 'Honda', modelo: 'Civic', anio_inicio: 2012, anio_fin: 2015, motor: '2.0L' },
          { marca: 'Honda', modelo: 'Accord', anio_inicio: 2013, anio_fin: 2017, motor: '2.4L' },
        ],
      },

      // PASTILLAS DE FRENO
      {
        codigo: 'FRE-PAST-001',
        nombre: 'Pastillas Freno Delanteras Brembo P 54 032',
        descripcion: 'Pastillas cerámicas de alta performance',
        categoria: 'Pastillas de Freno',
        precio_compra: 65.0,
        precio_venta: 95.0,
        stock: 30,
        especificaciones: {
          material: 'Cerámico',
          temperatura_trabajo: '0°C a 700°C',
          coeficiente_friccion: '0.35-0.45',
          posicion: 'Delantera',
          espesor_nuevo: '17mm',
          espesor_minimo: '2mm',
          incluye_sensores: 'No',
        },
        numeros_parte: [
          { numero: 'P 54 032', tipo: 'Aftermarket', fabricante: 'Brembo' },
          { numero: '04465-02140', tipo: 'OEM', fabricante: 'Toyota' },
        ],
        compatibilidad: [
          {
            marca: 'Toyota',
            modelo: 'Corolla',
            anio_inicio: 2014,
            anio_fin: 2019,
            posicion: 'Delantero',
          },
          {
            marca: 'Toyota',
            modelo: 'RAV4',
            anio_inicio: 2015,
            anio_fin: 2018,
            posicion: 'Delantero',
          },
        ],
      },

      // AMORTIGUADORES
      {
        codigo: 'SUS-AMOR-001',
        nombre: 'Amortiguador Delantero Monroe 5847',
        descripcion: 'Amortiguador hidráulico con válvula de seguridad',
        categoria: 'Amortiguadores',
        precio_compra: 85.0,
        precio_venta: 125.0,
        stock: 16,
        especificaciones: {
          tipo_amortiguador: 'Hidráulico',
          posicion: 'Delantero',
          longitud_comprimido: '340mm',
          longitud_extendido: '565mm',
          diametro_piston: '36mm',
          diametro_vastago: '14mm',
          tipo_montaje: 'McPherson',
          incluye_copela: 'No',
        },
        numeros_parte: [
          { numero: '5847', tipo: 'Aftermarket', fabricante: 'Monroe' },
          { numero: '48510-02190', tipo: 'OEM', fabricante: 'Toyota' },
        ],
        compatibilidad: [
          {
            marca: 'Toyota',
            modelo: 'Corolla',
            anio_inicio: 2009,
            anio_fin: 2013,
            posicion: 'Delantero',
          },
          {
            marca: 'Toyota',
            modelo: 'Yaris',
            anio_inicio: 2007,
            anio_fin: 2014,
            posicion: 'Delantero',
          },
        ],
      },

      // NEUMÁTICOS
      {
        codigo: 'NEU-RAD-001',
        nombre: 'Neumático Michelin Energy XM2 185/65R14',
        descripcion: 'Neumático de alta durabilidad y ahorro de combustible',
        categoria: 'Neumáticos Radiales',
        precio_compra: 75.0,
        precio_venta: 110.0,
        stock: 24,
        especificaciones: {
          medida: '185/65R14',
          indice_carga: '86H',
          velocidad_max: '210 km/h',
          tipo_banda: 'Radial',
          profundidad_banda: '8mm',
          presion_recomendada: '32 PSI',
          rotacional: 'No',
          temporada: 'All Season',
        },
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Corolla', anio_inicio: 2009, anio_fin: 2013 },
          { marca: 'Nissan', modelo: 'Versa', anio_inicio: 2012, anio_fin: 2016 },
          { marca: 'Chevrolet', modelo: 'Spark', anio_inicio: 2010, anio_fin: 2015 },
        ],
      },

      // BATERÍAS
      {
        codigo: 'ELE-BAT-001',
        nombre: 'Batería Bosch S4 026 70Ah',
        descripcion: 'Batería libre mantenimiento tecnología AGM',
        categoria: 'Baterías',
        precio_compra: 95.0,
        precio_venta: 140.0,
        stock: 12,
        especificaciones: {
          capacidad: '70Ah',
          voltaje: '12V',
          corriente_arranque: '630A',
          tecnologia: 'AGM',
          mantenimiento: 'Libre',
          dimensiones: '278x175x190mm',
          peso: '17.9kg',
          garantia: '24 meses',
        },
        numeros_parte: [
          { numero: 'S4 026', tipo: 'Aftermarket', fabricante: 'Bosch' },
          { numero: '28800-54P00', tipo: 'OEM', fabricante: 'Nissan' },
        ],
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Corolla', anio_inicio: 2014, anio_fin: 2024 },
          { marca: 'Nissan', modelo: 'Sentra', anio_inicio: 2013, anio_fin: 2024 },
          { marca: 'Honda', modelo: 'Civic', anio_inicio: 2012, anio_fin: 2024 },
          { marca: 'Hyundai', modelo: 'Elantra', anio_inicio: 2011, anio_fin: 2024 },
        ],
      },
    ];

    // Insertar productos
    const insertProducto = db.prepare(`
      INSERT OR IGNORE INTO productos (id, codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const insertEspecificacion = db.prepare(`
      INSERT OR IGNORE INTO especificaciones_tecnicas (id, producto_id, especificacion_clave, especificacion_valor, unidad_medida)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertNumeroParte = db.prepare(`
      INSERT OR IGNORE INTO numeros_parte (producto_id, numero_parte, tipo_parte, fabricante, activo)
      VALUES (?, ?, ?, ?, 1)
    `);

    const insertCompatibilidad = db.prepare(`
      INSERT OR IGNORE INTO productos_compatibilidad (producto_id, marca_vehiculo_id, modelo_vehiculo_id, anio_inicio, anio_fin, motor, posicion, verificado)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    repuestos.forEach((repuesto) => {
      const productoId = generateId('prod');
      // Usar la categoría general por defecto si no existe la técnica
      let categoriaId = categoriaIds[repuesto.categoria];
      if (!categoriaId) {
        // Buscar en la tabla categorias original
        const catGeneral = db
          .prepare('SELECT id FROM categorias WHERE nombre = ? LIMIT 1')
          .get('General');
        categoriaId = catGeneral ? catGeneral.id : 'cat_general';
      }

      // Insertar producto
      insertProducto.run(
        productoId,
        repuesto.codigo,
        repuesto.nombre,
        repuesto.descripcion,
        categoriaId,
        repuesto.precio_compra,
        repuesto.precio_venta,
        repuesto.stock,
        now
      );

      // Insertar especificaciones técnicas
      if (repuesto.especificaciones) {
        Object.entries(repuesto.especificaciones).forEach(([clave, valor]) => {
          const especId = generateId('spec');
          insertEspecificacion.run(especId, productoId, clave, valor, null);
        });
      }

      // Insertar números de parte
      if (repuesto.numeros_parte) {
        repuesto.numeros_parte.forEach((np) => {
          insertNumeroParte.run(productoId, np.numero, np.tipo, np.fabricante);
        });
      }

      // Insertar compatibilidad
      if (repuesto.compatibilidad) {
        repuesto.compatibilidad.forEach((comp) => {
          const marcaId = marcaIds[comp.marca];
          const modeloKey = `${comp.marca}_${comp.modelo}`;
          const modeloId = modeloIds[modeloKey];

          if (marcaId && modeloId) {
            insertCompatibilidad.run(
              productoId,
              marcaId,
              modeloId,
              comp.anio_inicio,
              comp.anio_fin,
              comp.motor || null,
              comp.posicion || null
            );
          }
        });
      }
    });

    console.log('✅ Banco de datos de repuestos creado exitosamente');
    console.log('📊 Resumen:');

    const stats = {
      marcas: db.prepare('SELECT COUNT(*) as count FROM marcas_vehiculos').get().count,
      modelos: db.prepare('SELECT COUNT(*) as count FROM modelos_vehiculos').get().count,
      categorias_tecnicas: db.prepare('SELECT COUNT(*) as count FROM categorias_tecnicas').get()
        .count,
      productos_tecnicos: db
        .prepare(
          'SELECT COUNT(*) as count FROM productos WHERE categoria_id IN (SELECT id FROM categorias_tecnicas)'
        )
        .get().count,
      especificaciones: db.prepare('SELECT COUNT(*) as count FROM especificaciones_tecnicas').get()
        .count,
      numeros_parte: db.prepare('SELECT COUNT(*) as count FROM numeros_parte').get().count,
      compatibilidades: db.prepare('SELECT COUNT(*) as count FROM productos_compatibilidad').get()
        .count,
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });

    db.close();
    console.log('🎉 Catálogo técnico completo creado!');
  } catch (error) {
    console.error('❌ Error creando catálogo técnico:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  seedCatalogoTecnico();
}

module.exports = { seedCatalogoTecnico };
