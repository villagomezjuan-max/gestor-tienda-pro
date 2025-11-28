// ========================================
// CATÁLOGO DE MÓDULOS CLASIFICADO CORRECTAMENTE
// ========================================

const MODULES_CLASSIFIED = {
  // 🔴 OBLIGATORIOS GLOBALES (7 módulos)
  // Siempre aparecen, NO se pueden desactivar
  OBLIGATORIOS: [
    {
      id: 'ventas',
      label: 'Ventas',
      description: 'Sistema de ventas, POS y facturación básica.',
      category: 'ventas',
      requires: ['productos', 'clientes'],
      obligatorioGlobal: true,
      permitidoEn: ['all'],
      minPlan: 'basico',
      mandatory: true
    },
    {
      id: 'productos',
      label: 'Productos',
      description: 'Catálogo de productos y servicios.',
      category: 'inventario',
      requires: [],
      obligatorioGlobal: true,
      permitidoEn: ['all'],
      minPlan: 'basico',
      mandatory: true
    },
    {
      // ========================================
      // CATÁLOGO DE MÓDULOS CLASIFICADO CORRECTAMENTE
      // ========================================

      const MODULES_CLASSIFIED = {
        // 🔴 OBLIGATORIOS GLOBALES
        OBLIGATORIOS: [
          {
            id: 'ventas',
            label: 'Ventas',
            description: 'Sistema de ventas, POS y facturación básica.',
            category: 'ventas',
            requires: ['productos', 'clientes'],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          },
          {
            id: 'productos',
            label: 'Productos',
            description: 'Catálogo de productos y servicios.',
            category: 'inventario',
            requires: [],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          },
          {
            id: 'clientes',
            label: 'Clientes',
            description: 'Gestión de clientes y base de datos.',
            category: 'ventas',
            requires: [],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          },
          {
            id: 'inventario',
            label: 'Inventario',
            description: 'Stock, kardex y control de existencias.',
            category: 'inventario',
            requires: ['productos'],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          },
          {
            id: 'historial_ventas',
            label: 'Historial Ventas',
            description: 'Registro y auditoría de transacciones.',
            category: 'ventas',
            requires: ['ventas'],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          },
          {
            id: 'finanzas',
            label: 'Finanzas',
            description: 'Flujo de caja, ingresos y gastos.',
            category: 'finanzas',
            requires: ['ventas'],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          },
          {
            id: 'documentos',
            label: 'Documentos',
            description: 'Facturas, comprobantes y documentos legales.',
            category: 'operacion',
            requires: ['ventas'],
            obligatorioGlobal: true,
            permitidoEn: ['all'],
            minPlan: 'basico',
            mandatory: true
          }
        ],

        // 🟠 MÓDULOS DE TALLER
        TALLER: [
          {
            id: 'ordenes_trabajo',
            label: 'Órdenes de Trabajo',
            description: 'Servicios, diagnósticos y reparaciones.',
            category: 'taller',
            requires: ['clientes', 'vehiculos'],
            permitidoEn: ['mecanica'],
            minPlan: 'pro',
            soloParaTipo: 'mecanica'
          },
          {
            id: 'vehiculos',
            label: 'Vehículos',
            description: 'Ficha de vehículos, placas, kilometraje.',
            category: 'taller',
            requires: ['clientes'],
            permitidoEn: ['mecanica'],
            minPlan: 'basico',
            soloParaTipo: 'mecanica'
          },
          {
            id: 'mis_tareas',
            label: 'Mis Tareas',
            description: 'Dashboard operativo para técnicos.',
            category: 'taller',
            requires: ['ordenes_trabajo'],
            permitidoEn: ['mecanica'],
            minPlan: 'basico',
            soloParaTipo: 'mecanica'
          },
          {
            id: 'agenda_taller',
            label: 'Agenda',
            description: 'Citas de servicio y calendario.',
            category: 'taller',
            requires: ['clientes'],
            permitidoEn: ['mecanica'],
            minPlan: 'basico',
            soloParaTipo: 'mecanica'
          },
          {
            id: 'catalogo_tecnico',
            label: 'Catálogo Técnico',
            description: 'Especificaciones, repuestos y manuales.',
            category: 'taller',
            requires: ['productos'],
            permitidoEn: ['mecanica'],
            minPlan: 'pro',
            soloParaTipo: 'mecanica'
          },
          {
            id: 'contactos_taller',
            label: 'Contactos',
            description: 'Directorio de clientes y proveedores.',
            category: 'ventas',
            requires: [],
            permitidoEn: ['mecanica'],
            minPlan: 'basico',
            soloParaTipo: 'mecanica'
          },
          {
            id: 'analisis_financiero_taller',
            label: 'Análisis Financiero',
            description: 'Rentabilidad por servicio y técnico.',
            category: 'finanzas',
            requires: ['finanzas', 'ventas'],
            permitidoEn: ['mecanica'],
            minPlan: 'pro',
            soloParaTipo: 'mecanica'
          }
        ],

        // 🟡 MÓDULOS DE TIENDA/RETAIL
        TIENDA: [
          {
            id: 'compras_tienda',
            label: 'Compras',
            description: 'Órdenes de compra a proveedores.',
            category: 'inventario',
            requires: ['inventario', 'proveedores'],
            permitidoEn: ['tiendas'],
            minPlan: 'basico',
            soloParaTipo: 'tiendas'
          },
          {
            id: 'proveedores_tienda',
            label: 'Proveedores',
            description: 'Gestión de proveedores.',
            category: 'inventario',
            requires: [],
            permitidoEn: ['tiendas'],
            minPlan: 'basico',
            soloParaTipo: 'tiendas'
          },
          {
            id: 'contactos_tienda',
            label: 'Contactos',
            description: 'Directorio de clientes.',
            category: 'ventas',
            requires: [],
            permitidoEn: ['tiendas'],
            minPlan: 'basico',
            soloParaTipo: 'tiendas'
          },
          {
            id: 'marketing_ia',
            label: 'Marketing IA',
            description: 'Campañas y recomendaciones inteligentes.',
            category: 'relacion',
            requires: ['clientes'],
            permitidoEn: ['tiendas'],
            minPlan: 'pro',
            soloParaTipo: 'tiendas'
          },
          {
            id: 'publicidad',
            label: 'Publicidad',
            description: 'Gestión de anuncios y promociones.',
            category: 'relacion',
            requires: ['clientes'],
            permitidoEn: ['tiendas'],
            minPlan: 'pro',
            soloParaTipo: 'tiendas'
          },
          {
            id: 'notificaciones_inteligentes',
            label: 'Notificaciones IA',
            description: 'Sistema de notificaciones inteligentes con IA secretarial.',
            category: 'relacion',
            requires: [],
            obligatorioGlobal: false,
            permitidoEn: ['tiendas', 'ferreteria', 'restaurante', 'farmacia', 'taller'],
            minPlan: 'basico'
          },
          // REEMPLAZADO POR notificaciones_inteligentes
          /*{
            id: 'recordatorios_tienda',
            label: 'Recordatorios',
            description: 'Notificaciones a clientes.',
            category: 'relacion',
            requires: ['clientes'],
            permitidoEn: ['tiendas'],
            minPlan: 'basico',
            soloParaTipo: 'tiendas'
          },*/
          {
            id: 'estadisticas_tienda',
            label: 'Estadísticas',
            description: 'Reportes avanzados.',
            category: 'finanzas',
            requires: ['ventas'],
            permitidoEn: ['tiendas'],
            minPlan: 'pro',
            soloParaTipo: 'tiendas'
          }
        ],

        // 🟢 MÓDULOS DE FERRETERÍA
        FERRETERIA: [
          {
            id: 'compras_ferreteria',
            label: 'Compras',
            description: 'Abastecimiento especializado para ferreterías.',
            category: 'inventario',
            requires: ['inventario', 'proveedores'],
            permitidoEn: ['ferreteria'],
            minPlan: 'basico',
            soloParaTipo: 'ferreteria'
          },
          {
            id: 'proveedores_ferreteria',
            label: 'Proveedores',
            description: 'Gestión de proveedores y condiciones.',
            category: 'inventario',
            requires: [],
            permitidoEn: ['ferreteria'],
            minPlan: 'basico',
            soloParaTipo: 'ferreteria'
          },
          {
            id: 'catalogo_tecnico_ferreteria',
            label: 'Catálogo Técnico',
            description: 'Especificaciones técnicas de productos.',
            category: 'taller',
            requires: ['productos'],
            permitidoEn: ['ferreteria'],
            minPlan: 'pro',
            soloParaTipo: 'ferreteria'
          },
          {
            id: 'contactos_ferreteria',
            label: 'Contactos',
            description: 'Directorio especializado.',
            category: 'ventas',
            requires: [],
            permitidoEn: ['ferreteria'],
            minPlan: 'basico',
            soloParaTipo: 'ferreteria'
          },
          {
            id: 'importar_csv_ferreteria',
            label: 'Importar CSV',
            description: 'Carga masiva de productos.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['ferreteria'],
            minPlan: 'basico',
            soloParaTipo: 'ferreteria'
          },
          {
            id: 'analisis_financiero_ferreteria',
            label: 'Análisis Financiero',
            description: 'Reportes por línea de producto.',
            category: 'finanzas',
            requires: ['finanzas', 'ventas'],
            permitidoEn: ['ferreteria'],
            minPlan: 'pro',
            soloParaTipo: 'ferreteria'
          }
        ],

        // 🔵 MÓDULOS DE RESTAURANTE
        RESTAURANTE: [
          {
            id: 'agenda_restaurante',
            label: 'Agenda',
            description: 'Reservas y turnos de mesas.',
            category: 'taller',
            requires: ['clientes'],
            permitidoEn: ['restaurante'],
            minPlan: 'basico',
            soloParaTipo: 'restaurante'
          },
          {
            id: 'contactos_restaurante',
            label: 'Contactos',
            description: 'Clientes frecuentes.',
            category: 'ventas',
            requires: [],
            permitidoEn: ['restaurante'],
            minPlan: 'basico',
            soloParaTipo: 'restaurante'
          },
          // REEMPLAZADO POR notificaciones_inteligentes
          /*{
            id: 'recordatorios_restaurante',
            label: 'Recordatorios',
            description: 'Cumpleaños y aniversarios importantes.',
            category: 'relacion',
            requires: ['clientes'],
            permitidoEn: ['restaurante'],
            minPlan: 'pro',
            soloParaTipo: 'restaurante'
          },*/
          {
            id: 'marketing_ia_restaurante',
            label: 'Marketing IA',
            description: 'Promociones personalizadas.',
            category: 'relacion',
            requires: ['clientes'],
            permitidoEn: ['restaurante'],
            minPlan: 'pro',
            soloParaTipo: 'restaurante'
          },
          {
            id: 'analisis_financiero_restaurante',
            label: 'Análisis Financiero',
            description: 'Indicadores por servicio, día y mesa.',
            category: 'finanzas',
            requires: ['finanzas', 'ventas'],
            permitidoEn: ['restaurante'],
            minPlan: 'pro',
            soloParaTipo: 'restaurante'
          }
        ],

        // 💜 MÓDULOS DE FARMACIA
        FARMACIA: [
          // REEMPLAZADO POR notificaciones_inteligentes
          /*{
            id: 'recordatorios_farmacia',
            label: 'Recordatorios',
            description: 'Alertas de vencimientos.',
            category: 'relacion',
            requires: ['clientes'],
            permitidoEn: ['farmacia'],
            minPlan: 'basico',
            soloParaTipo: 'farmacia'
          },*/
          {
            id: 'contabilidad_farmacia',
            label: 'Contabilidad',
            description: 'Requerido por regulación.',
            category: 'finanzas',
            requires: ['finanzas'],
            permitidoEn: ['farmacia'],
            minPlan: 'enterprise',
            soloParaTipo: 'farmacia'
          },
          {
            id: 'cuentas_cobrar_pagar_farmacia',
            label: 'Cuentas por Cobrar/Pagar',
            description: 'Facturación a clínicas.',
            category: 'finanzas',
            requires: ['finanzas'],
            permitidoEn: ['farmacia'],
            minPlan: 'pro',
            soloParaTipo: 'farmacia'
          },
          {
            id: 'contactos_farmacia',
            label: 'Contactos',
            description: 'Médicos y clínicas asociados.',
            category: 'ventas',
            requires: [],
            permitidoEn: ['farmacia'],
            minPlan: 'basico',
            soloParaTipo: 'farmacia'
          },
          {
            id: 'analisis_financiero_farmacia',
            label: 'Análisis Financiero',
            description: 'Indicadores por línea terapéutica.',
            category: 'finanzas',
            requires: ['finanzas', 'ventas'],
            permitidoEn: ['farmacia'],
            minPlan: 'pro',
            soloParaTipo: 'farmacia'
          },
          {
            id: 'importar_csv_farmacia',
            label: 'Importar CSV',
            description: 'Carga de inventario.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['farmacia'],
            minPlan: 'basico',
            soloParaTipo: 'farmacia'
          }
        ],

        // 🖤 MÓDULOS ADMINISTRATIVOS
        ADMIN: [
          {
            id: 'gestor_central',
            label: 'Gestor Central',
            description: 'Panel de administración del sistema.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['admin'],
            minPlan: 'enterprise',
            adminOnly: true,
            soloParaAdmin: true
          },
          {
            id: 'logs_sistema',
            label: 'Logs del Sistema',
            description: 'Auditoría y eventos.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['admin'],
            minPlan: 'enterprise',
            adminOnly: true,
            soloParaAdmin: true
          },
          {
            id: 'historial_notificaciones',
            label: 'Historial de Notificaciones',
            description: 'Todas las notificaciones enviadas.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['admin'],
            minPlan: 'enterprise',
            adminOnly: true,
            soloParaAdmin: true
          },
          {
            id: 'importar_csv_admin',
            label: 'Importar CSV',
            description: 'Carga masiva general del sistema.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['admin'],
            minPlan: 'enterprise',
            adminOnly: true,
            soloParaAdmin: true
          },
          {
            id: 'backup_datos',
            label: 'Backup & Datos',
            description: 'Respaldos y restauración.',
            category: 'operacion',
            requires: [],
            permitidoEn: ['admin'],
            minPlan: 'enterprise',
            adminOnly: true,
            soloParaAdmin: true
          }
        ]
      };

      function getModulesByType(businessType, userRole = 'user') {
        const modules = [];

        modules.push(...MODULES_CLASSIFIED.OBLIGATORIOS);

        switch (businessType) {
          case 'mecanica':
            modules.push(...MODULES_CLASSIFIED.TALLER);
            break;
          case 'tiendas':
            modules.push(...MODULES_CLASSIFIED.TIENDA);
            break;
          case 'ferreteria':
            modules.push(...MODULES_CLASSIFIED.FERRETERIA);
            break;
          case 'restaurante':
            modules.push(...MODULES_CLASSIFIED.RESTAURANTE);
            break;
          case 'farmacia':
            modules.push(...MODULES_CLASSIFIED.FARMACIA);
            break;
          default:
            break;
        }

        if (userRole === 'super_admin') {
          modules.push(...MODULES_CLASSIFIED.ADMIN);
        }

        return modules;
      }

      function flattenModules() {
        const result = [];
        for (const category of Object.keys(MODULES_CLASSIFIED)) {
          result.push(...MODULES_CLASSIFIED[category]);
        }
        return result;
      }

      const MODULE_LOOKUP = new Map(flattenModules().map((module) => [module.id, module]));

      module.exports = {
        MODULES_CLASSIFIED,
        getModulesByType,
        flattenModules,
        MODULE_LOOKUP
      };
    },
    {
      id: 'historial_notificaciones',
      label: 'Historial de Notificaciones',
      description: 'Todas las notificaciones enviadas.',
      category: 'operacion',
      requires: [],
      permitidoEn: ['admin'],
      minPlan: 'enterprise',
      adminOnly: true,
      soloParaAdmin: true
    },
    {
      id: 'importar_csv_admin',
      label: 'Importar CSV',
      description: 'Carga masiva general del sistema.',
      category: 'operacion',
      requires: [],
      permitidoEn: ['admin'],
      minPlan: 'enterprise',
      adminOnly: true,
      soloParaAdmin: true
    },
    {
      id: 'backup_datos',
      label: 'Backup & Datos',
      description: 'Respaldos y restauración.',
      category: 'operacion',
      requires: [],
      permitidoEn: ['admin'],
      minPlan: 'enterprise',
      adminOnly: true,
      soloParaAdmin: true
    }
  ]
};

// Función para obtener módulos según tipo de negocio
function getModulesByType(businessType, userRole = 'user') {
  const modules = [];

  // SIEMPRE agregar obligatorios globales
  modules.push(...MODULES_CLASSIFIED.OBLIGATORIOS);

  // Agregar módulos especializados según tipo
  switch (businessType) {
    case 'mecanica':
      modules.push(...MODULES_CLASSIFIED.TALLER);
      break;
    case 'tiendas':
      modules.push(...MODULES_CLASSIFIED.TIENDA);
      break;
    case 'ferreteria':
      modules.push(...MODULES_CLASSIFIED.FERRETERIA);
      break;
    case 'restaurante':
      modules.push(...MODULES_CLASSIFIED.RESTAURANTE);
      break;
    case 'farmacia':
      modules.push(...MODULES_CLASSIFIED.FARMACIA);
      break;
  }

  // Agregar módulos administrativos si es admin
  if (userRole === 'super_admin') {
    modules.push(...MODULES_CLASSIFIED.ADMIN);
  }

  return modules;
}

// Convertir a formato plano para compatibilidad
function flattenModules() {
  const result = [];
  for (const category in MODULES_CLASSIFIED) {
    result.push(...MODULES_CLASSIFIED[category]);
  }
  return result;
}

// Crear lookup map
const MODULE_LOOKUP = new Map(flattenModules().map(m => [m.id, m]));

module.exports = {
  MODULES_CLASSIFIED,
  getModulesByType,
  flattenModules,
  MODULE_LOOKUP
};
