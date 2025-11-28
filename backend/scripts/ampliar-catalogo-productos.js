#!/usr/bin/env node
/**
 * Script para ampliar el catálogo con productos adicionales específicos para Ecuador
 * Incluye productos populares en talleres ecuatorianos con datos técnicos completos
 * Gestor Tienda Pro v2.0
 */

const path = require('path');

const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gestor_tienda.db');

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Productos adicionales populares en Ecuador con especificaciones completas
const productosEcuatorianos = [
  // ============= SISTEMA ELÉCTRICO =============
  {
    categoria: 'Sistema Eléctrico',
    codigo_sistema: 'ELECTRICO',
    productos: [
      {
        nombre: 'Batería 12V 60Ah Libre Mantenimiento',
        marca: 'Bosch',
        sku: '60Ah-S4025',
        descripcion:
          'Batería sellada con tecnología de calcio para mayor durabilidad y arranque en frío',
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Corolla', anos: '2014-2023', motor: '1.6L/1.8L' },
          { marca: 'Hyundai', modelo: 'Accent', anos: '2018-2023', motor: '1.4L/1.6L' },
          { marca: 'Chevrolet', modelo: 'Sail', anos: '2015-2023', motor: '1.4L' },
        ],
        especificaciones: [
          'Capacidad: 60Ah',
          'Corriente arranque: 540A',
          'Dimensiones: 242x175x190mm',
          'Peso: 15.8kg',
          'Tecnología: AGM',
          'Temperatura operación: -18°C a +50°C',
        ],
        oem: '28800-2Y900',
        precio_compra: 89.5,
        precio_venta: 135.0,
        stock: 25,
      },
      {
        nombre: 'Alternador 12V 90A',
        marca: 'Denso',
        sku: '104210-3590',
        descripcion:
          'Alternador remanufacturado con garantía total, incluye polea y regulador interno',
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Hilux', anos: '2006-2015', motor: '2.7L Gasolina' },
          { marca: 'Toyota', modelo: 'Fortuner', anos: '2006-2015', motor: '2.7L' },
        ],
        especificaciones: [
          'Voltaje: 12V',
          'Amperaje: 90A',
          'Rotación: Derecha',
          'Polea: 6 estrías',
          'Tipo brush: Carbón',
          'Conexiones: 3 terminales',
        ],
        oem: '27060-0L070',
        precio_compra: 185.0,
        precio_venta: 285.0,
        stock: 8,
      },
      {
        nombre: 'Motor Arranque 12V 1.4kW',
        marca: 'Valeo',
        sku: '458178',
        descripcion:
          'Motor de arranque con solenoide integrado, 9 dientes, ideal para motores diesel',
        compatibilidad: [
          { marca: 'Chevrolet', modelo: 'D-Max', anos: '2014-2022', motor: '2.5L/3.0L Diesel' },
        ],
        especificaciones: [
          'Potencia: 1.4kW',
          'Dientes piñón: 9',
          'Rotación: Derecha',
          'Voltaje: 12V',
          'Tipo: Reducción',
          'Solenoide: Integrado',
        ],
        oem: '8980093231',
        precio_compra: 165.0,
        precio_venta: 255.0,
        stock: 12,
      },
    ],
  },

  // ============= SISTEMA REFRIGERACIÓN =============
  {
    categoria: 'Sistema Refrigeración',
    codigo_sistema: 'REFRIGERACION',
    productos: [
      {
        nombre: 'Radiador Aluminio-Plástico',
        marca: 'Valeo',
        sku: '732895',
        descripcion:
          'Radiador con núcleo de aluminio y tanques de plástico, incluye tapón de drenaje',
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Corolla', anos: '2014-2019', motor: '1.8L' },
          { marca: 'Toyota', modelo: 'Yaris', anos: '2014-2020', motor: '1.3L/1.5L' },
        ],
        especificaciones: [
          'Material núcleo: Aluminio',
          'Material tanques: Plástico reforzado',
          'Filas: 2',
          'Aletas por pulgada: 14',
          'Entrada: 32mm',
          'Salida: 32mm',
          'Dimensiones: 650x378x26mm',
        ],
        oem: '16400-0T040',
        precio_compra: 125.0,
        precio_venta: 189.0,
        stock: 15,
      },
      {
        nombre: 'Termostato 83°C',
        marca: 'Gates',
        sku: 'TH14383G1',
        descripcion: 'Termostato de apertura gradual con junta incluida, temperatura 83°C',
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Hilux', anos: '2006-2015', motor: '2.7L Gasolina' },
          { marca: 'Toyota', modelo: 'Fortuner', anos: '2006-2015', motor: '2.7L' },
        ],
        especificaciones: [
          'Temperatura apertura: 83°C ±2°C',
          'Apertura completa: 98°C',
          'Levante válvula: 8mm',
          'Diámetro: 56mm',
          'Material: Latón/Acero inox',
          'Incluye junta: Sí',
        ],
        oem: '90916-03093',
        precio_compra: 18.5,
        precio_venta: 28.75,
        stock: 45,
      },
      {
        nombre: 'Manguera Superior Radiador',
        marca: 'Continental',
        sku: 'AVH1234',
        descripcion: 'Manguera reforzada con fibra, resistente a altas temperaturas y presión',
        compatibilidad: [
          { marca: 'Hyundai', modelo: 'Accent', anos: '2018-2023', motor: '1.4L/1.6L' },
        ],
        especificaciones: [
          'Material: EPDM reforzado',
          'Temperatura máxima: 130°C',
          'Presión trabajo: 2.5 bar',
          'Longitud: 385mm',
          'Diámetro entrada: 32mm',
          'Diámetro salida: 32mm',
        ],
        oem: '25414-1R000',
        precio_compra: 22.0,
        precio_venta: 35.5,
        stock: 30,
      },
    ],
  },

  // ============= SISTEMA TRANSMISIÓN =============
  {
    categoria: 'Sistema Transmisión',
    codigo_sistema: 'TRANSMISION',
    productos: [
      {
        nombre: 'Kit Clutch Completo',
        marca: 'LUK',
        sku: '622309609',
        descripcion: 'Kit completo: disco, plato y cojinete, para transmisión manual 5 velocidades',
        compatibilidad: [
          { marca: 'Chevrolet', modelo: 'Sail', anos: '2015-2020', motor: '1.4L' },
          { marca: 'Chevrolet', modelo: 'Spark GT', anos: '2013-2020', motor: '1.2L' },
        ],
        especificaciones: [
          'Diámetro disco: 200mm',
          'Estrías: 20',
          'Tipo plato: Orgánico',
          'Tipo cojinete: Hidráulico',
          'Torque máximo: 140 Nm',
          'Material fricción: Orgánico',
        ],
        oem: '96801603',
        precio_compra: 195.0,
        precio_venta: 295.0,
        stock: 18,
      },
      {
        nombre: 'Aceite Transmisión Manual 75W-90',
        marca: 'Castrol',
        sku: 'MTF94',
        descripcion: 'Aceite sintético para transmisión manual, mejora suavidad del cambio',
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Hilux', anos: '2006-2023', motor: 'Todos' },
          { marca: 'Chevrolet', modelo: 'D-Max', anos: '2014-2023', motor: 'Todos' },
        ],
        especificaciones: [
          'Viscosidad: 75W-90',
          'Tipo: Sintético',
          'Especificación: API GL-4+',
          'Temperatura operación: -40°C a +150°C',
          'Contenido: 1 litro',
          'Cambio suavidad: +',
        ],
        oem: 'API-GL4',
        precio_compra: 12.5,
        precio_venta: 19.75,
        stock: 60,
      },
    ],
  },

  // ============= SISTEMA ESCAPE =============
  {
    categoria: 'Sistema Escape',
    codigo_sistema: 'ESCAPE',
    productos: [
      {
        nombre: 'Silenciador Trasero',
        marca: 'Walker',
        sku: '22387',
        descripcion: 'Silenciador con tecnología de absorción y reflexión, acero aluminizado',
        compatibilidad: [{ marca: 'Toyota', modelo: 'Corolla', anos: '2014-2019', motor: '1.8L' }],
        especificaciones: [
          'Material: Acero aluminizado',
          'Tipo: Absorción/Reflexión',
          'Diámetro entrada: 50mm',
          'Diámetro salida: 50mm',
          'Dimensiones: 400x200x150mm',
          'Vida útil: 5 años',
        ],
        oem: '17430-0T090',
        precio_compra: 85.0,
        precio_venta: 135.0,
        stock: 12,
      },
      {
        nombre: 'Catalizador Universal',
        marca: 'Magnaflow',
        sku: '94006',
        descripcion: 'Convertidor catalítico universal con sustrato cerámico, cumple normas EPA',
        compatibilidad: [
          { marca: 'Hyundai', modelo: 'Accent', anos: '2018-2023', motor: '1.4L/1.6L' },
          { marca: 'Chevrolet', modelo: 'Sail', anos: '2015-2023', motor: '1.4L' },
        ],
        especificaciones: [
          'Sustrato: Cerámico',
          'Células: 400 cpsi',
          'Diámetro: 101mm',
          'Longitud: 127mm',
          'Material carcasa: Acero inox',
          'Certificación: EPA',
        ],
        oem: '28510-1R850',
        precio_compra: 195.0,
        precio_venta: 315.0,
        stock: 8,
      },
    ],
  },

  // ============= SISTEMA DIRECCIÓN =============
  {
    categoria: 'Sistema Dirección',
    codigo_sistema: 'DIRECCION',
    productos: [
      {
        nombre: 'Bomba Dirección Hidráulica',
        marca: 'ZF Lenksysteme',
        sku: '8001841',
        descripcion: 'Bomba de dirección asistida con depósito integrado, incluye polea',
        compatibilidad: [
          { marca: 'Toyota', modelo: 'Hilux', anos: '2006-2015', motor: '2.7L/3.0L' },
        ],
        especificaciones: [
          'Tipo: Paletas',
          'Presión máxima: 140 bar',
          'Caudal: 8.5 L/min @ 1500 rpm',
          'Fluido: ATF Dexron III',
          'Polea: 6 estrías',
          'Depósito: Integrado',
        ],
        oem: '44320-0K020',
        precio_compra: 245.0,
        precio_venta: 385.0,
        stock: 6,
      },
      {
        nombre: 'Cremallera Dirección Completa',
        marca: 'TRW',
        sku: 'JRP1456',
        descripcion: 'Cremallera remanufacturada con terminales incluidos, garantía 2 años',
        compatibilidad: [
          { marca: 'Hyundai', modelo: 'Accent', anos: '2018-2023', motor: '1.4L/1.6L' },
        ],
        especificaciones: [
          'Tipo: Cremallera hidráulica',
          'Vueltas: 2.8 de tope a tope',
          'Diámetro piñón: 14.5mm',
          'Incluye terminales: Sí',
          'Garantía: 24 meses',
          'Estado: Remanufacturado',
        ],
        oem: '56300-1R000',
        precio_compra: 385.0,
        precio_venta: 595.0,
        stock: 4,
      },
    ],
  },
];

// Proveedores adicionales especializados
const proveedoresAdicionales = {
  'Baterías Ecuador S.A.': {
    direccion: 'Av. Carlos Julio Arosemena Km 2.5, Guayaquil',
    telefono: '+593-4-2681500',
    email: 'ventas@bateriasecuador.com',
    especialidad: 'Baterías Bosch, MAC, Tudor distribuidor oficial',
    condiciones_pago: '30-45 días',
    descuento_volumen: '8-15%',
  },
  'Eléctricos Automotrices del Pacífico': {
    direccion: 'Av. Pedro Carbo 425, Guayaquil',
    telefono: '+593-4-2562800',
    email: 'info@electricospacifico.com',
    especialidad: 'Denso, Valeo, Bosch alternadores y arranques',
    condiciones_pago: 'Inmediato, 30 días',
    descuento_volumen: '10-18%',
  },
  'Radiadores y Refrigeración Quito': {
    direccion: 'Av. 10 de Agosto N39-120, Quito',
    telefono: '+593-2-2457600',
    email: 'ventas@radiadoresquito.com',
    especialidad: 'Valeo, Nissens radiadores y componentes',
    condiciones_pago: '30 días',
    descuento_volumen: '5-12%',
  },
  'Transmisiones LUK Ecuador': {
    direccion: 'Panamericana Norte Km 12, Quito',
    telefono: '+593-2-3951200',
    email: 'info@lukecuador.com',
    especialidad: 'LUK, Sachs clutch y transmisiones',
    condiciones_pago: '45 días',
    descuento_volumen: '12-20%',
  },
  'Escape y Catalizadores Andinos': {
    direccion: 'Av. Mariscal Sucre S28-39, Quito',
    telefono: '+593-2-2789400',
    email: 'ventas@escapeandino.com',
    especialidad: 'Walker, Magnaflow sistemas de escape',
    condiciones_pago: '30 días',
    descuento_volumen: '8-15%',
  },
};

function ampliarCatalogoProductos() {
  console.log('🔄 Iniciando ampliación del catálogo con productos ecuatorianos...');

  try {
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    console.log('🔗 Conexión a la base de datos establecida');

    const now = new Date().toISOString();

    // Preparar statements
    const insertMarcaVehiculo = db.prepare(`
      INSERT OR IGNORE INTO marcas_vehiculos (id, nombre, activo, created_at)
      VALUES (?, ?, 1, ?)
    `);

    const insertModeloVehiculo = db.prepare(`
      INSERT OR IGNORE INTO modelos_vehiculos (id, marca_id, nombre, activo, created_at)  
      VALUES (?, ?, ?, 1, ?)
    `);

    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const insertProveedor = db.prepare(`
      INSERT OR IGNORE INTO proveedores (id, nombre, contacto, telefono, email, direccion, notas, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const insertProducto = db.prepare(`
      INSERT OR REPLACE INTO productos (id, codigo, nombre, descripcion, categoria_id, proveedor_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const insertEspecificacion = db.prepare(`
      INSERT OR IGNORE INTO especificaciones_tecnicas (producto_id, especificacion_clave, especificacion_valor, unidad_medida)
      VALUES (?, ?, ?, ?)
    `);

    const insertNumeroParte = db.prepare(`
      INSERT OR IGNORE INTO numeros_parte (producto_id, numero_parte, tipo_parte, fabricante, activo)
      VALUES (?, ?, ?, ?, 1)
    `);

    const insertCompatibilidad = db.prepare(`
      INSERT OR IGNORE INTO productos_compatibilidad (producto_id, marca_vehiculo_id, modelo_vehiculo_id, anio_inicio, anio_fin, motor, verificado)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    // Iniciar transacción
    const transaction = db.transaction(() => {
      // Insertar proveedores adicionales
      console.log('🏪 Insertando proveedores especializados...');
      Object.entries(proveedoresAdicionales).forEach(([nombre, datos]) => {
        const proveedorId = generateId('prov');
        const notasCompletas = `Especialidad: ${datos.especialidad}\nPago: ${datos.condiciones_pago}\nDescuentos: ${datos.descuento_volumen}`;

        insertProveedor.run(
          proveedorId,
          nombre,
          `${datos.telefono} - ${datos.email}`,
          datos.telefono,
          datos.email,
          datos.direccion,
          notasCompletas,
          now
        );
      });

      // Procesar cada categoría de productos ecuatorianos
      productosEcuatorianos.forEach((categoria) => {
        console.log(`📦 Procesando categoría: ${categoria.categoria}`);

        // Crear o usar categoría existente
        const categoriaId = generateId('cat');
        insertCategoria.run(
          categoriaId,
          categoria.categoria,
          `Productos del ${categoria.categoria.toLowerCase()}`,
          now
        );

        // Procesar cada producto
        categoria.productos.forEach((producto) => {
          const productoId = generateId('prod');

          // Insertar producto principal
          insertProducto.run(
            productoId,
            producto.sku,
            producto.nombre,
            producto.descripcion,
            categoriaId,
            null, // Se asignará proveedor específico después
            producto.precio_compra,
            producto.precio_venta,
            producto.stock,
            now
          );

          // Insertar especificaciones técnicas
          producto.especificaciones.forEach((spec) => {
            const [clave, valor] = spec.split(': ');
            if (clave && valor) {
              insertEspecificacion.run(productoId, clave.trim(), valor.trim(), null);
            }
          });

          // Insertar números de parte
          insertNumeroParte.run(productoId, producto.sku, 'Aftermarket', producto.marca);

          if (producto.oem && producto.oem !== 'API-GL4') {
            insertNumeroParte.run(productoId, producto.oem, 'OEM', 'Original');
          }

          // Insertar compatibilidades
          producto.compatibilidad.forEach((comp) => {
            // Crear/obtener marca de vehículo
            const marcaId = generateId('marca');
            insertMarcaVehiculo.run(marcaId, comp.marca, now);

            // Crear/obtener modelo de vehículo
            const modeloId = generateId('modelo');
            insertModeloVehiculo.run(modeloId, marcaId, comp.modelo, now);

            // Insertar compatibilidad
            const rangoAnos = comp.anos.split('-');
            const anioInicio = parseInt(rangoAnos[0]);
            const anioFin = rangoAnos.length > 1 ? parseInt(rangoAnos[1]) : anioInicio;

            insertCompatibilidad.run(
              productoId,
              marcaId,
              modeloId,
              anioInicio,
              anioFin,
              comp.motor
            );
          });
        });
      });
    });

    // Ejecutar transacción
    transaction();

    // Mostrar estadísticas
    const stats = {
      categorias_nuevas: productosEcuatorianos.length,
      productos_nuevos: productosEcuatorianos.reduce(
        (total, cat) => total + cat.productos.length,
        0
      ),
      total_productos: db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
      total_especificaciones: db
        .prepare('SELECT COUNT(*) as count FROM especificaciones_tecnicas')
        .get().count,
      total_proveedores: db.prepare('SELECT COUNT(*) as count FROM proveedores').get().count,
    };

    console.log('\n🎉 Ampliación del catálogo completada!');
    console.log('📊 Estadísticas:');
    console.log(`   - Categorías nuevas: ${stats.categorias_nuevas}`);
    console.log(`   - Productos nuevos: ${stats.productos_nuevos}`);
    console.log(`   - Total productos: ${stats.total_productos}`);
    console.log(`   - Total especificaciones: ${stats.total_especificaciones}`);
    console.log(`   - Total proveedores: ${stats.total_proveedores}`);

    db.close();
    console.log('✅ Base de datos actualizada correctamente');
  } catch (error) {
    console.error('❌ Error durante la ampliación:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  ampliarCatalogoProductos();
}

module.exports = { ampliarCatalogoProductos };
