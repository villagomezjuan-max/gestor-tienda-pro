#!/usr/bin/env node
/**
 * Script simplificado para crear catálogo de repuestos automotrices
 * Usar categorías existentes y enfocarse en los datos de productos
 * Gestor Tienda Pro v2.0
 */

const path = require('path');

const Database = require('better-sqlite3');

// Ruta de la base de datos
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'gestor_tienda.db');

function generateId(prefix = 'id') {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function seedRepuestosSimplificado() {
  console.log('🚗 Creando catálogo de repuestos automotrices simplificado...');

  try {
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const now = new Date().toISOString();

    // Primero crear las categorías que necesitamos
    console.log('📂 Creando categorías de repuestos...');
    const categorias = [
      {
        id: 'cat_aceites',
        nombre: 'Aceites y Lubricantes',
        descripcion: 'Aceites de motor y transmisión',
      },
      {
        id: 'cat_filtros_motor',
        nombre: 'Filtros de Motor',
        descripcion: 'Filtros de aceite, aire y combustible',
      },
      {
        id: 'cat_pastillas',
        nombre: 'Pastillas de Freno',
        descripcion: 'Pastillas delanteras y traseras',
      },
      {
        id: 'cat_amortiguadores',
        nombre: 'Amortiguadores',
        descripcion: 'Amortiguadores delanteros y traseros',
      },
      {
        id: 'cat_neumaticos_rad',
        nombre: 'Neumáticos Radiales',
        descripcion: 'Neumáticos radiales',
      },
      { id: 'cat_baterias', nombre: 'Baterías', descripcion: 'Baterías de arranque' },
    ];

    const insertCategoria = db.prepare(`
      INSERT OR IGNORE INTO categorias (id, nombre, descripcion, created_at)
      VALUES (?, ?, ?, ?)
    `);

    categorias.forEach((cat) => {
      insertCategoria.run(cat.id, cat.nombre, cat.descripcion, now);
    });

    // Repuestos con información técnica detallada
    console.log('📦 Insertando repuestos con información técnica...');

    const repuestos = [
      // ACEITES DE MOTOR
      {
        codigo: 'ACE-5W30-001',
        nombre: 'Aceite Motor Mobil 1 5W-30 Full Synthetic',
        descripcion:
          'Aceite sintético premium para motores a gasolina. Viscosidad 5W-30, normas API SN/CF, capacidad 4L. Temperatura de operación -30°C a +40°C. Compatible con Toyota Corolla 2014-2024, Honda Civic 2012-2024, Nissan Sentra 2013-2024.',
        categoria_id: 'cat_aceites',
        precio_compra: 28.5,
        precio_venta: 42.0,
        stock: 45,
      },
      {
        codigo: 'ACE-20W50-002',
        nombre: 'Aceite Motor Castrol GTX 20W-50',
        descripcion:
          'Aceite mineral para motores con alto kilometraje (+100,000 km). Viscosidad 20W-50, normas API SL/CF, capacidad 4L. Ideal para Toyota Hilux 2005-2015, Chevrolet D-Max 2012-2018.',
        categoria_id: 'cat_aceites',
        precio_compra: 18.75,
        precio_venta: 28.0,
        stock: 60,
      },
      {
        codigo: 'ACE-ATF-001',
        nombre: 'Aceite Transmisión Automática Dexron VI',
        descripcion:
          'Fluido ATF sintético Dexron VI para transmisiones automáticas. Compatible con la mayoría de vehículos modernos. Capacidad 4L.',
        categoria_id: 'cat_aceites',
        precio_compra: 32.0,
        precio_venta: 48.0,
        stock: 25,
      },

      // FILTROS
      {
        codigo: 'FIL-ACE-001',
        nombre: 'Filtro Aceite Mann W 712/75',
        descripcion:
          'Filtro de aceite de alta eficiencia (99.5%). Diámetro exterior 93mm, interior 62mm, altura 96mm, rosca M20x1.5. Números de parte: W712/75 (Mann), 15208-65F0C (Nissan), 90915-YZZD4 (Toyota). Compatible con Toyota Corolla 2014-2024, Nissan Sentra 2013-2024.',
        categoria_id: 'cat_filtros_motor',
        precio_compra: 8.2,
        precio_venta: 12.5,
        stock: 120,
      },
      {
        codigo: 'FIL-AIRE-001',
        nombre: 'Filtro Aire K&N 33-2304',
        descripcion:
          'Filtro de aire de alto flujo lavable (+50% flujo vs OEM). Algodón aceitado, dimensiones 318x235x25mm. Duración 1,600,000 km. Compatible con Honda Civic 2012-2015, Honda Accord 2013-2017.',
        categoria_id: 'cat_filtros_motor',
        precio_compra: 45.0,
        precio_venta: 68.0,
        stock: 25,
      },
      {
        codigo: 'FIL-COMB-001',
        nombre: 'Filtro Combustible Bosch 0 450 906 452',
        descripcion:
          'Filtro de combustible para sistema de inyección. Presión máxima 6 bar. Compatible con múltiples modelos Toyota, Nissan, Honda.',
        categoria_id: 'cat_filtros_motor',
        precio_compra: 15.5,
        precio_venta: 22.0,
        stock: 80,
      },

      // PASTILLAS DE FRENO
      {
        codigo: 'FRE-PAST-001',
        nombre: 'Pastillas Freno Delanteras Brembo P 54 032',
        descripcion:
          'Pastillas cerámicas de alta performance. Material cerámico, temperatura de trabajo 0°C a 700°C, coeficiente de fricción 0.35-0.45. Espesor nuevo 17mm, mínimo 2mm. Posición delantera. Compatible con Toyota Corolla 2014-2019, Toyota RAV4 2015-2018.',
        categoria_id: 'cat_pastillas',
        precio_compra: 65.0,
        precio_venta: 95.0,
        stock: 30,
      },
      {
        codigo: 'FRE-PAST-002',
        nombre: 'Pastillas Freno Traseras TRW GDB3389',
        descripcion:
          'Pastillas semi-metálicas para freno trasero. Buen balance precio/rendimiento. Compatible con Honda Civic 2012-2016, Honda Accord 2013-2017.',
        categoria_id: 'cat_pastillas',
        precio_compra: 35.0,
        precio_venta: 52.0,
        stock: 40,
      },
      {
        codigo: 'FRE-LIQ-001',
        nombre: 'Líquido Frenos Castrol DOT 4',
        descripcion:
          'Líquido de frenos DOT 4, punto de ebullición húmedo 165°C, seco 230°C. Capacidad 500ml. Compatible con todos los vehículos que requieren DOT 4.',
        categoria_id: 'cat_pastillas',
        precio_compra: 8.5,
        precio_venta: 13.0,
        stock: 75,
      },

      // AMORTIGUADORES
      {
        codigo: 'SUS-AMOR-001',
        nombre: 'Amortiguador Delantero Monroe 5847',
        descripcion:
          'Amortiguador hidráulico con válvula de seguridad. Posición delantera, longitud comprimido 340mm, extendido 565mm. Diámetro pistón 36mm, vástago 14mm. Tipo montaje McPherson. Compatible con Toyota Corolla 2009-2013, Toyota Yaris 2007-2014.',
        categoria_id: 'cat_amortiguadores',
        precio_compra: 85.0,
        precio_venta: 125.0,
        stock: 16,
      },
      {
        codigo: 'SUS-AMOR-002',
        nombre: 'Amortiguador Trasero KYB 343437',
        descripcion:
          'Amortiguador hidráulico trasero. Tecnología KYB de doble tubo. Compatible con Nissan Sentra 2013-2019, Nissan Versa 2012-2019.',
        categoria_id: 'cat_amortiguadores',
        precio_compra: 72.0,
        precio_venta: 105.0,
        stock: 20,
      },

      // NEUMÁTICOS
      {
        codigo: 'NEU-RAD-001',
        nombre: 'Neumático Michelin Energy XM2 185/65R14',
        descripcion:
          'Neumático de alta durabilidad y ahorro de combustible. Medida 185/65R14, índice de carga 86H, velocidad máxima 210 km/h. Banda radial, profundidad 8mm, presión recomendada 32 PSI. All Season. Compatible con Toyota Corolla 2009-2013, Nissan Versa 2012-2016, Chevrolet Spark 2010-2015.',
        categoria_id: 'cat_neumaticos_rad',
        precio_compra: 75.0,
        precio_venta: 110.0,
        stock: 24,
      },
      {
        codigo: 'NEU-RAD-002',
        nombre: 'Neumático Bridgestone Turanza T001 205/55R16',
        descripcion:
          'Neumático premium para sedanes medianos. Medida 205/55R16, índice 91V. Excelente agarre en húmedo y seco. Compatible con Honda Civic 2016-2024, Toyota Corolla 2014-2024.',
        categoria_id: 'cat_neumaticos_rad',
        precio_compra: 95.0,
        precio_venta: 140.0,
        stock: 16,
      },

      // BATERÍAS
      {
        codigo: 'ELE-BAT-001',
        nombre: 'Batería Bosch S4 026 70Ah',
        descripcion:
          'Batería libre mantenimiento tecnología AGM. Capacidad 70Ah, 12V, corriente de arranque 630A. Dimensiones 278x175x190mm, peso 17.9kg. Garantía 24 meses. Compatible con Toyota Corolla 2014-2024, Nissan Sentra 2013-2024, Honda Civic 2012-2024, Hyundai Elantra 2011-2024.',
        categoria_id: 'cat_baterias',
        precio_compra: 95.0,
        precio_venta: 140.0,
        stock: 12,
      },
      {
        codigo: 'ELE-BAT-002',
        nombre: 'Batería Varta Blue Dynamic C22 52Ah',
        descripcion:
          'Batería convencional para vehículos compactos. Capacidad 52Ah, 12V, corriente arranque 470A. Ideal para Chevrolet Spark, Nissan Versa, Hyundai Accent.',
        categoria_id: 'cat_baterias',
        precio_compra: 65.0,
        precio_venta: 95.0,
        stock: 18,
      },

      // REPUESTOS ADICIONALES
      {
        codigo: 'MOT-BUJ-001',
        nombre: 'Bujías NGK BKR6E-11 (Set 4 unidades)',
        descripcion:
          'Set de 4 bujías de níquel. Electrodo de níquel, gap 1.1mm. Compatible con motores 1.6L y 1.8L Toyota, Nissan, Honda. Duración aproximada 30,000 km.',
        categoria_id: 'cat_general',
        precio_compra: 24.0,
        precio_venta: 36.0,
        stock: 50,
      },
      {
        codigo: 'TRA-EMB-001',
        nombre: 'Kit Embrague Sachs 3000 950 778',
        descripcion:
          'Kit completo de embrague: disco, plato y collarin. Compatible con Toyota Corolla 1.8L 2009-2019. Incluye alineador.',
        categoria_id: 'cat_general',
        precio_compra: 180.0,
        precio_venta: 260.0,
        stock: 8,
      },
      {
        codigo: 'REF-RAD-001',
        nombre: 'Radiador Denso 221-3217',
        descripcion:
          'Radiador de aluminio con tanques de plástico. Dimensiones 650x378x26mm. Compatible con Honda Civic 2012-2015.',
        categoria_id: 'cat_general',
        precio_compra: 120.0,
        precio_venta: 175.0,
        stock: 6,
      },
    ];

    // Insertar productos
    const insertProducto = db.prepare(`
      INSERT OR IGNORE INTO productos (id, codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock, activo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    repuestos.forEach((repuesto) => {
      const productoId = generateId('prod');
      insertProducto.run(
        productoId,
        repuesto.codigo,
        repuesto.nombre,
        repuesto.descripcion,
        repuesto.categoria_id,
        repuesto.precio_compra,
        repuesto.precio_venta,
        repuesto.stock,
        now
      );
    });

    console.log('✅ Catálogo de repuestos creado exitosamente');
    console.log('📊 Resumen:');

    const stats = {
      categorias_nuevas: categorias.length,
      productos_agregados: repuestos.length,
      total_productos: db.prepare('SELECT COUNT(*) as count FROM productos').get().count,
      valor_inventario: db.prepare('SELECT SUM(precio_venta * stock) as total FROM productos').get()
        .total,
    };

    Object.entries(stats).forEach(([key, value]) => {
      console.log(`   - ${key}: ${typeof value === 'number' ? value.toLocaleString() : value}`);
    });

    console.log('📋 Categorías creadas:');
    categorias.forEach((cat) => {
      const count = db
        .prepare('SELECT COUNT(*) as count FROM productos WHERE categoria_id = ?')
        .get(cat.id).count;
      console.log(`   - ${cat.nombre}: ${count} productos`);
    });

    db.close();
    console.log('🎉 Catálogo técnico básico completo!');
  } catch (error) {
    console.error('❌ Error creando catálogo:', error.message);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  seedRepuestosSimplificado();
}

module.exports = { seedRepuestosSimplificado };
