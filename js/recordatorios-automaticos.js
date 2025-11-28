/* ========================================
   MÓDULO: SISTEMA DE RECORDATORIOS AUTOMÁTICOS PARA TALLER
   Sistema inteligente de recordatorios por tiempo/kilometraje
   ======================================== */

const RecordatoriosAutomaticos = {
  // Reglas de mantenimiento por defecto
  reglasMantenimiento: {
    aceite_motor: {
      nombre: 'Cambio de Aceite de Motor',
      intervalos: {
        tiempo: 90, // días
        kilometraje: 5000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'alta',
      icono: 'fas fa-oil-can',
    },
    filtro_aceite: {
      nombre: 'Cambio de Filtro de Aceite',
      intervalos: {
        tiempo: 90, // días
        kilometraje: 5000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'alta',
      icono: 'fas fa-filter',
    },
    filtro_aire: {
      nombre: 'Cambio de Filtro de Aire',
      intervalos: {
        tiempo: 180, // días
        kilometraje: 10000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'media',
      icono: 'fas fa-wind',
    },
    frenos: {
      nombre: 'Revisión de Sistema de Frenos',
      intervalos: {
        tiempo: 365, // días
        kilometraje: 20000, // km
      },
      tipo: 'revision',
      prioridad: 'alta',
      icono: 'fas fa-stop-circle',
    },
    rotacion_llantas: {
      nombre: 'Rotación de Llantas',
      intervalos: {
        tiempo: 120, // días
        kilometraje: 8000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'media',
      icono: 'fas fa-sync-alt',
    },
    alineacion_balanceo: {
      nombre: 'Alineación y Balanceo',
      intervalos: {
        tiempo: 180, // días
        kilometraje: 15000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'media',
      icono: 'fas fa-balance-scale',
    },
    correa_distribucion: {
      nombre: 'Cambio de Correa de Distribución',
      intervalos: {
        tiempo: 1460, // 4 años
        kilometraje: 80000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'urgente',
      icono: 'fas fa-cog',
    },
    refrigerante: {
      nombre: 'Cambio de Refrigerante',
      intervalos: {
        tiempo: 730, // 2 años
        kilometraje: 40000, // km
      },
      tipo: 'mantenimiento',
      prioridad: 'media',
      icono: 'fas fa-thermometer-half',
    },
    bateria: {
      nombre: 'Revisión de Batería',
      intervalos: {
        tiempo: 365, // 1 año
        kilometraje: null, // No aplica por kilometraje
      },
      tipo: 'revision',
      prioridad: 'media',
      icono: 'fas fa-car-battery',
    },
    aire_acondicionado: {
      nombre: 'Mantenimiento de Aire Acondicionado',
      intervalos: {
        tiempo: 180, // días
        kilometraje: null, // No aplica por kilometraje
      },
      tipo: 'mantenimiento',
      prioridad: 'baja',
      icono: 'fas fa-snowflake',
    },
  },

  /**
   * Inicializa el sistema de recordatorios automáticos
   */
  async init() {
    console.log('🔔 Inicializando sistema de recordatorios automáticos...');
    await this.verificarRecordatoriosPendientes();
    // Solo crear recordatorios al inicio si el usuario lo solicita manualmente
    // NO automáticamente para evitar duplicados
    this.iniciarMonitoreoAutomatico();
  },

  /**
   * Verifica y crea recordatorios para todos los vehículos registrados
   */
  async crearRecordatoriosAutomaticos() {
    try {
      // Usar Database en lugar de fetch API
      const vehiculos = (await Database.getCollection('vehiculos')) || [];

      for (const vehiculo of vehiculos) {
        await this.procesarVehiculo(vehiculo);
      }

      console.log(`✅ Procesados ${vehiculos.length} vehículos para recordatorios automáticos`);
    } catch (error) {
      console.error('Error creando recordatorios automáticos:', error);
    }
  },

  /**
   * Procesa un vehículo específico para generar recordatorios
   */
  async procesarVehiculo(vehiculo) {
    const ultimoServicio = vehiculo.fecha_ultimo_servicio
      ? new Date(vehiculo.fecha_ultimo_servicio)
      : new Date(vehiculo.created_at || Date.now());

    const kilometrajeActual = vehiculo.kilometraje || 0;

    // Procesar cada regla de mantenimiento
    for (const [tipoServicio, regla] of Object.entries(this.reglasMantenimiento)) {
      await this.evaluarReglaMantenimiento(
        vehiculo,
        tipoServicio,
        regla,
        ultimoServicio,
        kilometrajeActual
      );
    }
  },

  /**
   * Evalúa una regla específica de mantenimiento para un vehículo
   */
  async evaluarReglaMantenimiento(
    vehiculo,
    tipoServicio,
    regla,
    ultimoServicio,
    kilometrajeActual
  ) {
    const ahora = new Date();
    const diasTranscurridos = Math.floor((ahora - ultimoServicio) / (1000 * 60 * 60 * 24));

    let debeCrearRecordatorio = false;
    let fechaVencimiento = null;
    let razon = '';

    // Verificar por tiempo
    if (regla.intervalos.tiempo && diasTranscurridos >= regla.intervalos.tiempo - 7) {
      fechaVencimiento = new Date(ultimoServicio);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + regla.intervalos.tiempo);
      debeCrearRecordatorio = true;
      razon = `${regla.intervalos.tiempo} días desde último servicio`;
    }

    // Verificar por kilometraje (si aplica)
    if (regla.intervalos.kilometraje) {
      const ultimoKilometraje = await this.obtenerUltimoKilometrajeServicio(
        vehiculo.id,
        tipoServicio
      );
      const kilometrosRecorridos = kilometrajeActual - ultimoKilometraje;

      if (kilometrosRecorridos >= regla.intervalos.kilometraje - 500) {
        debeCrearRecordatorio = true;
        razon += razon
          ? ` y ${regla.intervalos.kilometraje}km recorridos`
          : `${regla.intervalos.kilometraje}km recorridos`;
      }
    }

    // Crear recordatorio si es necesario
    if (debeCrearRecordatorio) {
      await this.crearRecordatorioMantenimiento(
        vehiculo,
        tipoServicio,
        regla,
        fechaVencimiento,
        razon
      );
    }
  },

  /**
   * Obtiene el último kilometraje registrado para un tipo de servicio específico
   */
  async obtenerUltimoKilometrajeServicio(vehiculoId, tipoServicio) {
    try {
      const ordenes = await Auth._request(
        `/ordenes-trabajo?vehiculo_id=${vehiculoId}&tipo=${tipoServicio}&limit=1`
      );

      if (ordenes.length > 0) {
        return ordenes[0].kilometraje || 0;
      }

      // Si no hay órdenes específicas, usar el kilometraje base del vehículo
      const vehiculo = await Auth._request(`/vehiculos/${vehiculoId}`);
      return vehiculo?.kilometraje || 0;
    } catch (error) {
      console.error('Error obteniendo último kilometraje:', error);
      return 0;
    }
  },

  /**
   * Crea un recordatorio de mantenimiento específico
   */
  async crearRecordatorioMantenimiento(vehiculo, tipoServicio, regla, fechaVencimiento, razon) {
    const recordatorioExistente = await this.verificarRecordatorioExistente(
      vehiculo.id,
      tipoServicio
    );

    if (recordatorioExistente) {
      console.log(`Recordatorio ya existe para ${vehiculo.placa} - ${regla.nombre}`);
      return;
    }

    const recordatorio = {
      titulo: `${regla.nombre} - ${vehiculo.placa}`,
      descripcion: `Vehículo: ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}\nCliente: ${vehiculo.cliente_nombre}\nRazón: ${razon}\nTeléfono: ${vehiculo.cliente_telefono || 'No registrado'}`,
      fecha: fechaVencimiento
        ? fechaVencimiento.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      hora: '09:00',
      tipo: regla.tipo,
      prioridad: regla.prioridad,
      vehiculo_id: vehiculo.id,
      cliente_id: vehiculo.cliente_id,
      servicio_tipo: tipoServicio,
      automatico: true,
      icono: regla.icono,
      completado: false,
      notificado: false,
    };

    try {
      const result = await Auth._request('/recordatorios', {
        method: 'POST',
        body: recordatorio,
      });

      if (result.success) {
        console.log(`✅ Recordatorio creado: ${regla.nombre} para ${vehiculo.placa}`);

        // Notificar inmediatamente si es urgente
        if (regla.prioridad === 'urgente') {
          await this.notificarRecordatorioUrgente(recordatorio);
        }

        // 🔔 INTEGRACIÓN TELEGRAM: Enviar notificación al cliente
        await this.enviarNotificacionTelegram(vehiculo, recordatorio, regla, tipoServicio);
      }
    } catch (error) {
      console.error('Error creando recordatorio:', error);
    }
  },

  /**
   * Verifica si ya existe un recordatorio para este vehículo y tipo de servicio
   */
  async verificarRecordatorioExistente(vehiculoId, tipoServicio) {
    try {
      // Usar Database local para evitar múltiples llamadas a la API
      const todosRecordatorios = (await Database.getCollection('recordatorios')) || [];
      const recordatorios = todosRecordatorios.filter(
        (r) => r.vehiculo_id === vehiculoId && r.servicio_tipo === tipoServicio && !r.completado
      );
      return recordatorios.length > 0;
    } catch (error) {
      console.error('Error verificando recordatorio existente:', error);
      return false;
    }
  },

  /**
   * Notifica recordatorios urgentes inmediatamente
   */
  async notificarRecordatorioUrgente(recordatorio) {
    // Aquí se integraría con el sistema de notificaciones (Telegram/WhatsApp)
    console.log(`🚨 RECORDATORIO URGENTE: ${recordatorio.titulo}`);

    // Crear notificación en el sistema
    if (window.Utils && window.Utils.showToast) {
      Utils.showToast(`Recordatorio urgente: ${recordatorio.titulo}`, 'warning');
    }

    // TODO: Integrar con Telegram/WhatsApp cuando esté implementado
  },

  /**
   * Verifica recordatorios pendientes que requieren atención
   */
  async verificarRecordatoriosPendientes() {
    try {
      const hoy = new Date();
      // Usar Database en lugar de fetch API
      const todosRecordatorios = (await Database.getCollection('recordatorios')) || [];
      const recordatorios = todosRecordatorios.filter((r) => !r.completado);

      const vencidos = recordatorios.filter((r) => {
        const fechaRecordatorio = new Date(r.fecha + ' ' + r.hora);
        return fechaRecordatorio <= hoy;
      });

      if (vencidos.length > 0) {
        console.log(`⚠️  ${vencidos.length} recordatorios vencidos encontrados`);
        await this.procesarRecordatoriosVencidos(vencidos);
      }
    } catch (error) {
      console.error('Error verificando recordatorios pendientes:', error);
    }
  },

  /**
   * Procesa recordatorios vencidos
   */
  async procesarRecordatoriosVencidos(recordatoriosVencidos) {
    for (const recordatorio of recordatoriosVencidos) {
      if (!recordatorio.notificado) {
        await this.notificarRecordatorioVencido(recordatorio);
      }
    }
  },

  /**
   * Notifica un recordatorio vencido
   */
  async notificarRecordatorioVencido(recordatorio) {
    console.log(`📅 Recordatorio vencido: ${recordatorio.titulo}`);

    // Marcar como notificado usando Database
    try {
      await Database.updateItem('recordatorios', recordatorio.id, {
        ...recordatorio,
        notificado: true,
      });
    } catch (error) {
      console.error('Error marcando recordatorio como notificado:', error);
    }
  },

  /**
   * Inicia el monitoreo automático (cada hora)
   */
  iniciarMonitoreoAutomatico() {
    // Verificar cada hora si hay recordatorios pendientes que notificar
    setInterval(
      () => {
        this.verificarRecordatoriosPendientes();
      },
      60 * 60 * 1000
    ); // 1 hora

    // Crear nuevos recordatorios cada 24 horas (una vez al día)
    // Reducido de 4 horas a 24 horas para evitar duplicados
    setInterval(
      () => {
        this.crearRecordatoriosAutomaticos();
      },
      24 * 60 * 60 * 1000
    ); // 24 horas

    console.log(
      '🔄 Monitoreo automático de recordatorios iniciado (verificación cada hora, creación cada 24 horas)'
    );
  },

  /**
   * Crea recordatorios para órdenes de trabajo próximas a vencer
   */
  async crearRecordatoriosEntrega() {
    try {
      const ordenes = await Auth._request(
        '/ordenes-trabajo?estado=en_proceso,espera_repuestos,finalizado'
      );

      const hoy = new Date();
      const dosUnasDelante = new Date();
      dosUnasDelante.setDate(hoy.getDate() + 2);

      for (const orden of ordenes) {
        if (orden.fecha_entrega_estimada) {
          const fechaEntrega = new Date(orden.fecha_entrega_estimada);

          // Si la entrega es en menos de 2 días y no hay recordatorio
          if (fechaEntrega <= dosUnasDelante && fechaEntrega >= hoy) {
            await this.crearRecordatorioEntregaOrden(orden);
          }
        }
      }
    } catch (error) {
      console.error('Error creando recordatorios de entrega:', error);
    }
  },

  /**
   * Crea recordatorio específico para entrega de orden
   */
  async crearRecordatorioEntregaOrden(orden) {
    const recordatorioExistente = await this.verificarRecordatorioExistente(
      orden.vehiculo_id,
      'entrega_orden'
    );

    if (recordatorioExistente) return;

    const recordatorio = {
      titulo: `Entrega de vehículo - Orden #${orden.numero}`,
      descripcion: `Vehículo: ${orden.vehiculo_placa}\nCliente: ${orden.cliente_nombre}\nTeléfono: ${orden.cliente_telefono || 'No registrado'}\nProblema: ${orden.problema_reportado}`,
      fecha: orden.fecha_entrega_estimada,
      hora: '10:00',
      tipo: 'entrega',
      prioridad: 'alta',
      vehiculo_id: orden.vehiculo_id,
      cliente_id: orden.cliente_id,
      orden_trabajo_id: orden.id,
      servicio_tipo: 'entrega_orden',
      automatico: true,
      icono: 'fas fa-handshake',
      completado: false,
      notificado: false,
    };

    try {
      const result = await Auth._request('/recordatorios', {
        method: 'POST',
        body: recordatorio,
      });

      if (result.success) {
        console.log(`🚛 Recordatorio de entrega creado para orden #${orden.numero}`);
      }
    } catch (error) {
      console.error('Error creando recordatorio de entrega:', error);
    }
  },

  /**
   * Crea recordatorios para reabastecimiento de stock bajo
   */
  async crearRecordatoriosStock() {
    try {
      const data = await Auth._request('/reportes/stock-bajo');

      const productosStockBajo = Array.isArray(data?.productos) ? data.productos : [];

      if (productosStockBajo.length > 0) {
        const descripcionListado = productosStockBajo
          .slice(0, 10)
          .map((p) => {
            const stock = Number.isFinite(p.stock) ? p.stock : 0;
            const minimo = Number.isFinite(p.stockMinimo) ? p.stockMinimo : null;
            const meta = minimo !== null ? ` / mínimo ${minimo}` : '';
            return `- ${p.nombre}: ${stock}${meta}`;
          })
          .join('\n');

        const recordatorio = {
          titulo: 'Reabastecimiento urgente de stock',
          descripcion: `Productos con stock bajo (${productosStockBajo.length}):\n${descripcionListado}`,
          fecha: new Date().toISOString().split('T')[0],
          hora: '08:00',
          tipo: 'reabastecimiento',
          prioridad: 'alta',
          automatico: true,
          icono: 'fas fa-boxes',
          completado: false,
          notificado: false,
        };

        const createResult = await Auth._request('/recordatorios', {
          method: 'POST',
          body: recordatorio,
        });

        if (createResult?.success !== false) {
          console.log(
            `📦 Recordatorio de reabastecimiento creado para ${productosStockBajo.length} productos`
          );
        }
      }
    } catch (error) {
      console.error('Error creando recordatorios de stock:', error);
    }
  },

  /**
   * Obtiene recordatorios de mantenimiento para el dashboard
   */
  async obtenerRecordatoriosDashboard() {
    try {
      const recordatorios = await Auth._request(
        '/recordatorios?tipo=mantenimiento,revision,entrega&completado=false&limit=10'
      );

      return recordatorios.sort((a, b) => {
        const fechaA = new Date(a.fecha + ' ' + a.hora);
        const fechaB = new Date(b.fecha + ' ' + b.hora);
        return fechaA - fechaB;
      });
    } catch (error) {
      console.error('Error obteniendo recordatorios para dashboard:', error);
      return [];
    }
  },

  /**
   * Marca un recordatorio como completado
   */
  async completarRecordatorio(recordatorioId) {
    try {
      const result = await Auth._request(`/recordatorios/${recordatorioId}`, {
        method: 'PUT',
        body: {
          completado: true,
          fecha_completado: new Date().toISOString(),
        },
      });

      if (result.success) {
        console.log('✅ Recordatorio marcado como completado');
        return true;
      }
    } catch (error) {
      console.error('Error completando recordatorio:', error);
    }
    return false;
  },

  /**
   * Renderiza widget de recordatorios para el dashboard
   */
  renderizarWidgetRecordatorios(recordatorios) {
    if (!recordatorios || recordatorios.length === 0) {
      return `
                <div class="widget-recordatorios">
                    <h4><i class="fas fa-bell"></i> Recordatorios</h4>
                    <div class="empty-state-mini">
                        <i class="fas fa-check-circle"></i>
                        <p>No hay recordatorios pendientes</p>
                    </div>
                </div>
            `;
    }

    return `
            <div class="widget-recordatorios">
                <h4><i class="fas fa-bell"></i> Recordatorios Pendientes (${recordatorios.length})</h4>
                <div class="recordatorios-list">
                    ${recordatorios
                      .slice(0, 5)
                      .map(
                        (recordatorio) => `
                        <div class="recordatorio-item priority-${recordatorio.prioridad}">
                            <div class="recordatorio-icon">
                                <i class="${recordatorio.icono || 'fas fa-bell'}"></i>
                            </div>
                            <div class="recordatorio-content">
                                <h5>${recordatorio.titulo}</h5>
                                <p>${recordatorio.descripcion.substring(0, 60)}${recordatorio.descripcion.length > 60 ? '...' : ''}</p>
                                <small>
                                    <i class="fas fa-calendar"></i> ${new Date(recordatorio.fecha).toLocaleDateString()}
                                    <i class="fas fa-clock"></i> ${recordatorio.hora}
                                </small>
                            </div>
                            <div class="recordatorio-actions">
                                <button class="btn-mini btn-success" onclick="RecordatoriosAutomaticos.completarRecordatorio('${recordatorio.id}')" title="Completar">
                                    <i class="fas fa-check"></i>
                                </button>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
                ${
                  recordatorios.length > 5
                    ? `
                    <div class="widget-footer">
                        <a href="#" onclick="App.loadModule('notificaciones_inteligentes')" class="btn btn-link">
                            Ver todos los recordatorios (${recordatorios.length - 5} más)
                        </a>
                    </div>
                `
                    : ''
                }
            </div>
        `;
  },

  /**
   * Enviar notificación de recordatorio por Telegram
   */
  async enviarNotificacionTelegram(vehiculo, recordatorio, regla, tipoServicio) {
    try {
      // Verificar si Telegram está disponible y configurado
      if (typeof TelegramNotificaciones === 'undefined' || !TelegramNotificaciones.inicializado) {
        console.log('📱 Telegram no está disponible o configurado');
        return;
      }

      // Obtener datos del cliente
      const clientes = Database.getCollection('clientes') || [];
      const cliente = clientes.find((c) => c.id === vehiculo.cliente_id);

      if (!cliente) {
        console.warn('Cliente no encontrado para el vehículo:', vehiculo.placa);
        return;
      }

      // Solo enviar si el cliente tiene Telegram configurado
      if (!cliente.telegram_chat_id) {
        console.log(`Cliente ${cliente.nombre} no tiene Telegram configurado`);
        return;
      }

      // Preparar fechas para el mensaje
      const fechaVencimiento = recordatorio.fecha ? new Date(recordatorio.fecha) : new Date();

      // Enviar notificación usando el módulo de Telegram
      const resultado = await TelegramNotificaciones.enviarNotificacionMantenimiento(
        cliente,
        vehiculo,
        tipoServicio,
        fechaVencimiento
      );

      if (resultado.success) {
        console.log(`✅ Notificación Telegram enviada: ${cliente.nombre} - ${vehiculo.placa}`);

        // Marcar como notificado en la base de datos
        try {
          await Auth._request(`/recordatorios/${recordatorio.id}`, {
            method: 'PATCH',
            body: {
              notificado: true,
              telegram_message_id: resultado.messageId,
              fecha_notificacion: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('Error actualizando estado de notificación:', error);
        }
      } else {
        console.warn('❌ Error enviando notificación Telegram:', resultado.error);
      }
    } catch (error) {
      console.error('Error en notificación Telegram:', error);
    }
  },
};

// Exponer globalmente
window.RecordatoriosAutomaticos = RecordatoriosAutomaticos;
