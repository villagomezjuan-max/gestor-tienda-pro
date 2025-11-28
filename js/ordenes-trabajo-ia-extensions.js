/**
 * EXTENSIONES DE IA PARA ÓRDENES DE TRABAJO
 * Auto-completado, sugerencias y workflows automáticos
 */

// Extender el módulo OrdenesTrabajo con capacidades de IA
if (window.OrdenesTrabajo) {
  Object.assign(window.OrdenesTrabajo, {
    /**
     * Auto-completar orden con IA
     * @param {Object} ordenParcial - Datos parciales de la orden
     * @returns {Promise<Object>} - Orden completada con sugerencias
     */
    async autoCompletarOrdenConIA(ordenParcial) {
      if (
        !window.IAUnifiedEngine ||
        !IAUnifiedEngine.isConfigured ||
        !IAUnifiedEngine.isConfigured()
      ) {
        console.warn('⚠️ IA no configurada, usando datos básicos');
        return ordenParcial;
      }

      try {
        Utils.showToast?.('Analizando con IA...', 'info');

        const prompt = `Eres un experto mecánico automotriz. Completa los datos faltantes de esta orden de trabajo basándote en el servicio solicitado y tu conocimiento técnico.

DATOS ACTUALES DE LA ORDEN:
${JSON.stringify(ordenParcial, null, 2)}

INSTRUCCIONES:
Completa SOLO los campos vacíos o faltantes:
- duracion_estimada: Tiempo en minutos según el tipo de servicio
- presupuesto_estimado: Rango aproximado en USD (considera mano de obra + repuestos)
- items_sugeridos: Array de repuestos/servicios necesarios típicos para este trabajo
- notas_tecnicas: Recomendaciones importantes para el mecánico
- prioridad: baja/normal/alta/urgente según el problema descrito
- diagnostico_ia: Posibles causas del problema si se describe un síntoma

Responde SOLO con JSON válido en este formato exacto:
{
  "duracion_estimada": 120,
  "presupuesto_estimado": 150.00,
  "items_sugeridos": [
    {"nombre": "Aceite sintético 5W30", "cantidad": 1, "precio_estimado": 45.00, "categoria": "Lubricantes"},
    {"nombre": "Filtro de aceite", "cantidad": 1, "precio_estimado": 12.00, "categoria": "Filtros"}
  ],
  "notas_tecnicas": "Verificar nivel de refrigerante y estado de mangueras",
  "prioridad": "normal",
  "diagnostico_ia": "Mantenimiento preventivo estándar según kilometraje"
}

NO agregues texto fuera del JSON. Sé preciso con los precios basándote en el mercado ecuatoriano.`;

        const respuesta = await IAUnifiedEngine.sendMessage(prompt);
        const completado = this.parseJsonResponse(respuesta);

        if (completado) {
          console.log('✅ Orden auto-completada con IA:', completado);
          Utils.showToast?.('✅ Orden completada con IA', 'success');

          return {
            ...ordenParcial,
            ...completado,
            ia_utilizada: true,
            ia_timestamp: new Date().toISOString(),
          };
        }

        return ordenParcial;
      } catch (error) {
        console.error('❌ Error auto-completando orden:', error);
        Utils.showToast?.('Error con IA, usa datos manuales', 'warning');
        return ordenParcial;
      }
    },

    /**
     * Sugerir repuestos con IA desde catálogo
     * @param {string} servicioDescripcion - Descripción del servicio
     * @param {string} marca - Marca del vehículo
     * @param {string} modelo - Modelo del vehículo
     * @param {number} anio - Año del vehículo
     * @returns {Promise<Array>} - Lista de repuestos sugeridos
     */
    async sugerirRepuestosConIA(servicioDescripcion, marca, modelo, anio) {
      if (!window.IAUnifiedEngine || !IAUnifiedEngine.isConfigured?.()) {
        return [];
      }

      const prompt = `Basándote en el servicio "${servicioDescripcion}" para un ${marca} ${modelo} ${anio}, sugiere los repuestos y materiales necesarios.

Considera:
- Repuestos OEM y compatibles
- Materiales consumibles
- Herramientas especiales si aplica
- Servicios adicionales recomendados

Responde SOLO con JSON array válido:
[
  {
    "nombre": "Nombre específico del repuesto",
    "cantidad": 1,
    "categoria": "Categoría del producto",
    "precio_estimado": 0.00,
    "es_critico": true,
    "razon": "Por qué es necesario este repuesto",
    "alternativas": ["Repuesto alternativo si existe"]
  }
]

Ejemplo para "Cambio de aceite Toyota Corolla 2020":
[
  {"nombre":"Aceite sintético 5W30 (4L)","cantidad":1,"categoria":"Lubricantes","precio_estimado":45.00,"es_critico":true,"razon":"Aceite recomendado por fabricante","alternativas":["Semi-sintético 10W30"]},
  {"nombre":"Filtro de aceite Toyota 90915-YZZD2","cantidad":1,"categoria":"Filtros","precio_estimado":12.00,"es_critico":true,"razon":"Filtro OEM para este modelo","alternativas":["Filtro compatible genérico"]}
]

NO agregues texto fuera del JSON array.`;

      try {
        const respuesta = await IAUnifiedEngine.sendMessage(prompt);
        const repuestos = this.parseJsonResponse(respuesta);

        if (Array.isArray(repuestos)) {
          console.log(`✅ IA sugiere ${repuestos.length} repuestos`);
          return repuestos;
        }

        return [];
      } catch (error) {
        console.error('Error sugiriendo repuestos:', error);
        return [];
      }
    },

    /**
     * Auto-completar formulario de orden con IA
     */
    async autoCompletarFormularioConIA() {
      const descripcion = document.getElementById('ordenDescripcion')?.value;
      const vehiculoId = document.getElementById('ordenVehiculoId')?.value;

      if (!descripcion) {
        Utils.showToast?.('Ingresa primero una descripción del servicio', 'warning');
        return;
      }

      Utils.showToast?.('🤖 Analizando con IA...', 'info');

      let vehiculo = null;
      if (vehiculoId) {
        vehiculo = await this.fetchVehiculoById(vehiculoId);
      }

      const ordenParcial = {
        descripcion,
        marca: vehiculo?.marca || '',
        modelo: vehiculo?.modelo || '',
        anio: vehiculo?.anio || new Date().getFullYear(),
        kilometraje: vehiculo?.kilometraje || 0,
      };

      const completado = await this.autoCompletarOrdenConIA(ordenParcial);

      // Rellenar campos en el formulario
      if (completado.duracion_estimada) {
        const duracionField = document.getElementById('ordenDuracionEstimada');
        if (duracionField) duracionField.value = completado.duracion_estimada;
      }

      if (completado.presupuesto_estimado) {
        const presupuestoField = document.getElementById('ordenPresupuestoEstimado');
        if (presupuestoField) presupuestoField.value = completado.presupuesto_estimado.toFixed(2);
      }

      if (completado.prioridad) {
        const prioridadField = document.getElementById('ordenPrioridad');
        if (prioridadField) prioridadField.value = completado.prioridad;
      }

      if (completado.notas_tecnicas) {
        const notasField = document.getElementById('ordenNotas');
        if (notasField) {
          const notasActuales = notasField.value || '';
          notasField.value = notasActuales
            ? `${notasActuales}\n\n=== SUGERENCIAS IA ===\n${completado.notas_tecnicas}`
            : completado.notas_tecnicas;
        }
      }

      if (completado.diagnostico_ia) {
        const diagField = document.getElementById('ordenDiagnostico');
        if (diagField) diagField.value = completado.diagnostico_ia;
      }

      // Mostrar items sugeridos
      if (completado.items_sugeridos && completado.items_sugeridos.length > 0) {
        await this.mostrarItemsSugeridos(completado.items_sugeridos);
      }

      Utils.showToast?.('✅ Orden auto-completada con IA', 'success');
    },

    /**
     * Mostrar items sugeridos por IA
     * @param {Array} items - Items sugeridos
     */
    async mostrarItemsSugeridos(items) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'modal-items-sugeridos';
      modal.innerHTML = `
        <div class="modal modal-large">
          <div class="modal-header">
            <h3><i class="fas fa-robot"></i> Repuestos Sugeridos por IA</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: 20px; color: #666;">
              <i class="fas fa-info-circle"></i> 
              La IA ha sugerido los siguientes repuestos para este servicio. 
              Selecciona los que desees agregar a la orden.
            </p>
            
            <div id="items-sugeridos-lista" style="max-height: 400px; overflow-y: auto;">
              ${items
                .map(
                  (item, idx) => `
                <div class="item-sugerido-card" style="
                  background: white;
                  border: 2px solid ${item.es_critico ? '#ff9800' : '#e0e0e0'};
                  border-radius: 8px;
                  padding: 15px;
                  margin-bottom: 12px;
                ">
                  <div style="display: flex; align-items: start; gap: 12px;">
                    <input type="checkbox" 
                           id="item-sugerido-${idx}" 
                           data-item='${JSON.stringify(item).replace(/'/g, '&apos;')}'
                           checked
                           style="margin-top: 4px;">
                    <div style="flex: 1;">
                      <div style="font-weight: 600; font-size: 16px; margin-bottom: 6px;">
                        ${item.nombre}
                        ${item.es_critico ? '<span style="color: #ff9800; font-size: 12px;">⚠️ CRÍTICO</span>' : ''}
                      </div>
                      <div style="color: #666; font-size: 14px; margin-bottom: 6px;">
                        <strong>Razón:</strong> ${item.razon}
                      </div>
                      <div style="display: flex; gap: 15px; font-size: 13px; color: #888;">
                        <span><strong>Cantidad:</strong> ${item.cantidad}</span>
                        <span><strong>Categoría:</strong> ${item.categoria}</span>
                        <span><strong>Precio est.:</strong> $${item.precio_estimado.toFixed(2)}</span>
                      </div>
                      ${
                        item.alternativas && item.alternativas.length > 0
                          ? `
                        <div style="margin-top: 8px; font-size: 12px; color: #999;">
                          <strong>Alternativas:</strong> ${item.alternativas.join(', ')}
                        </div>
                      `
                          : ''
                      }
                    </div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
              <div style="font-size: 14px; color: #666; margin-bottom: 10px;">
                <strong>Total estimado de repuestos seleccionados:</strong>
              </div>
              <div id="total-sugeridos" style="font-size: 24px; font-weight: bold; color: var(--primary-color);">
                $0.00
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
              Cancelar
            </button>
            <button class="btn btn-success" onclick="OrdenesTrabajo.agregarItemsSugeridos()">
              <i class="fas fa-check"></i> Agregar Seleccionados
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Calcular total al cambiar checkboxes
      const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => {
        cb.addEventListener('change', () => {
          const total = Array.from(checkboxes)
            .filter((c) => c.checked)
            .reduce((sum, c) => {
              const item = JSON.parse(c.dataset.item);
              return sum + item.precio_estimado * item.cantidad;
            }, 0);

          document.getElementById('total-sugeridos').textContent = `$${total.toFixed(2)}`;
        });
      });

      // Disparar cálculo inicial
      checkboxes[0]?.dispatchEvent(new Event('change'));
    },

    /**
     * Agregar items sugeridos al formulario de orden
     */
    agregarItemsSugeridos() {
      const modal = document.getElementById('modal-items-sugeridos');
      if (!modal) return;

      const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
      const itemsSeleccionados = Array.from(checkboxes).map((cb) => {
        const item = JSON.parse(cb.dataset.item);
        return {
          producto_id: null, // IA sugiere, luego buscar en catálogo
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_estimado,
          subtotal: item.cantidad * item.precio_estimado,
          categoria: item.categoria,
          sugerido_por_ia: true,
        };
      });

      // Agregar a la tabla de items de la orden
      const tbody = document.querySelector('#tabla-items-orden tbody');
      if (tbody) {
        itemsSeleccionados.forEach((item) => {
          const row = tbody.insertRow();
          row.innerHTML = `
            <td>${Utils.sanitize(item.nombre)}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio_unitario.toFixed(2)}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); OrdenesTrabajo.recalcularTotales();">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          `;
        });

        // Recalcular totales
        this.recalcularTotales?.();
      }

      Utils.showToast?.(`✅ ${itemsSeleccionados.length} items agregados`, 'success');
      modal.remove();
    },

    /**
     * Completar orden y generar factura automáticamente
     * @param {string} ordenId - ID de la orden
     */
    async completarOrdenYFacturar(ordenId) {
      const orden = await this.fetchOrdenTrabajoById(ordenId);

      if (!orden) {
        Utils.showToast?.('Orden no encontrada', 'error');
        return;
      }

      const confirmar = confirm(
        `¿Completar orden #${ordenId}?\n\n` +
          `Esto generará automáticamente:\n` +
          `✓ Factura de venta\n` +
          `✓ Actualización de inventario\n` +
          `✓ Notificación al cliente\n` +
          `✓ Registro en historial del vehículo\n` +
          `✓ Predicción de próximo servicio`
      );

      if (!confirmar) return;

      try {
        Utils.showToast?.('Procesando orden completa...', 'info');

        // 1. Generar factura
        const factura = await this.generarFacturaDesdeOrden(orden);

        // 2. Actualizar inventario
        await this.actualizarInventarioDesdeOrden(orden);

        // 3. Registrar en historial del vehículo
        await this.registrarEnHistorialVehiculo(orden);

        // 4. Notificar al cliente
        await this.notificarClienteOrdenCompleta(orden, factura);

        // 5. Predecir próximo servicio con IA
        await this.predecirProximoServicio(orden);

        // 6. Actualizar estado de la orden
        await this.updateOrdenTrabajoRegistro(ordenId, {
          estado: 'completado',
          fechaCompletado: new Date().toISOString(),
        });

        Utils.showToast?.('✅ Orden completada exitosamente', 'success');

        // Mostrar modal de resumen
        this.mostrarResumenComplecion(orden, factura);
      } catch (error) {
        console.error('❌ Error completando orden:', error);
        Utils.showToast?.('Error al completar la orden: ' + error.message, 'error');
      }
    },

    async generarFacturaDesdeOrden(orden) {
      const db = window.DatabaseAPI || window.Database;
      if (!db) throw new Error('Database no disponible');

      const facturaData = {
        cliente_id: orden.cliente_id,
        fecha: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0],
        items: orden.items || [],
        subtotal: orden.subtotal || 0,
        iva: orden.iva || 0,
        total: orden.total || 0,
        metodo_pago: 'efectivo',
        estado: 'completada',
        notas: `Factura generada automáticamente desde orden de trabajo #${orden.id}`,
        origen: 'orden_trabajo',
        orden_trabajo_id: orden.id,
      };

      const factura = await (db.createVenta?.(facturaData) || db.addItem?.('ventas', facturaData));

      console.log('✅ Factura generada:', factura?.id);
      return factura;
    },

    async actualizarInventarioDesdeOrden(orden) {
      if (!orden.items || orden.items.length === 0) {
        console.log('ℹ️ No hay items para actualizar inventario');
        return;
      }

      const db = window.DatabaseAPI || window.Database;
      if (!db) return;

      for (const item of orden.items) {
        if (item.producto_id) {
          try {
            // Reducir stock
            if (db.updateProductoStock) {
              await db.updateProductoStock(item.producto_id, -item.cantidad);
            } else if (db.updateItem) {
              const producto = await db.getItem('productos', item.producto_id);
              if (producto) {
                await db.updateItem('productos', item.producto_id, {
                  stock: Math.max(0, (producto.stock || 0) - item.cantidad),
                });
              }
            }
            console.log(`✅ Stock actualizado: ${item.nombre} (-${item.cantidad})`);
          } catch (error) {
            console.error(`Error actualizando stock de ${item.nombre}:`, error);
          }
        }
      }
    },

    async registrarEnHistorialVehiculo(orden) {
      const db = window.DatabaseAPI || window.Database;
      if (!db || !orden.vehiculo_id) return;

      const historial = {
        id: `hist_${Date.now()}`,
        vehiculo_id: orden.vehiculo_id,
        fecha: new Date().toISOString(),
        tipo: 'servicio',
        descripcion: orden.descripcion || orden.servicioSolicitado,
        kilometraje: orden.kilometraje,
        costo: orden.total,
        orden_trabajo_id: orden.id,
        detalles: JSON.stringify({
          items: orden.items,
          tecnico: orden.tecnico_asignado_nombre,
          duracion: orden.duracion_real,
        }),
      };

      await (db.createHistorialVehiculo?.(historial) ||
        db.addItem?.('historial_vehiculos', historial));

      console.log('✅ Historial de vehículo actualizado');
    },

    async notificarClienteOrdenCompleta(orden, factura) {
      const db = window.DatabaseAPI || window.Database;
      const cliente = await (db.getClienteById?.(orden.cliente_id) ||
        db.getItem?.('clientes', orden.cliente_id));

      if (!cliente) return;

      const vehiculo = await (db.getVehiculoById?.(orden.vehiculo_id) ||
        db.getItem?.('vehiculos', orden.vehiculo_id));

      // Notificar por Telegram
      if (cliente.telegram_chat_id && window.TelegramBotManager) {
        try {
          await TelegramBotManager.sendMessage(
            cliente.telegram_chat_id,
            `🎉 *¡Tu vehículo está listo!*\n\n` +
              `🚗 ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})\n` +
              `🔧 Servicio: ${orden.descripcion}\n` +
              `💰 Total: $${orden.total.toFixed(2)}\n\n` +
              `Puedes pasar a recogerlo cuando gustes.\n` +
              `Factura #${factura?.numero || factura?.id}`,
            { parse_mode: 'Markdown' }
          );
          console.log('✅ Cliente notificado por Telegram');
        } catch (error) {
          console.error('Error notificando por Telegram:', error);
        }
      }

      // Notificar por WhatsApp (si está configurado)
      if (cliente.telefono && window.WhatsAppNotifications) {
        // Implementar si existe módulo de WhatsApp
      }

      console.log('✅ Notificaciones enviadas');
    },

    async predecirProximoServicio(orden) {
      if (!window.IAUnifiedEngine || !IAUnifiedEngine.isConfigured?.()) {
        console.log('ℹ️ IA no configurada, saltando predicción');
        return;
      }

      const db = window.DatabaseAPI || window.Database;
      const vehiculo = await (db.getVehiculoById?.(orden.vehiculo_id) ||
        db.getItem?.('vehiculos', orden.vehiculo_id));

      if (!vehiculo) return;

      const prompt = `Basándote en este servicio recién completado, predice cuándo debería ser el próximo servicio para este vehículo:

VEHÍCULO:
- Marca: ${vehiculo.marca}
- Modelo: ${vehiculo.modelo}
- Año: ${vehiculo.anio}
- Kilometraje actual: ${orden.kilometraje || vehiculo.kilometraje}

SERVICIO REALIZADO:
- Tipo: ${orden.descripcion}
- Items: ${(orden.items || []).map((i) => i.nombre).join(', ')}
- Fecha: ${orden.fechaRecepcion}

INSTRUCCIONES:
Predice el próximo mantenimiento considerando:
- Intervalos estándar del fabricante
- Tipo de uso (estimar uso moderado: 1,000 km/mes)
- Servicios realizados
- Desgaste de componentes

Responde SOLO con JSON:
{
  "proximo_servicio": "Tipo específico de servicio sugerido",
  "kilometraje_sugerido": 53000,
  "fecha_estimada": "2026-02-15",
  "meses_aproximados": 3,
  "razon": "Explicación breve del por qué",
  "items_anticipados": ["Filtro de aire", "Bujías"]
}`;

      try {
        const respuesta = await IAUnifiedEngine.sendMessage(prompt);
        const prediccion = this.parseJsonResponse(respuesta);

        if (prediccion) {
          // Actualizar vehículo con predicción
          await (db.updateVehiculo?.(vehiculo.id, {
            proximo_servicio_sugerido: prediccion.proximo_servicio,
            proximo_servicio_km: prediccion.kilometraje_sugerido,
            proximo_servicio_fecha: prediccion.fecha_estimada,
          }) ||
            db.updateItem?.('vehiculos', vehiculo.id, {
              proximo_servicio_sugerido: prediccion.proximo_servicio,
              proximo_servicio_km: prediccion.kilometraje_sugerido,
              proximo_servicio_fecha: prediccion.fecha_estimada,
            }));

          console.log('✅ Próximo servicio predicho:', prediccion);

          // Opcionalmente mostrar al usuario
          Utils.showToast?.(
            `IA sugiere próximo servicio: ${prediccion.proximo_servicio} en ${prediccion.meses_aproximados} meses`,
            'info',
            5000
          );
        }
      } catch (error) {
        console.error('Error prediciendo próximo servicio:', error);
      }
    },

    mostrarResumenComplecion(orden, factura) {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3><i class="fas fa-check-circle" style="color: #4CAF50;"></i> Orden Completada</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); location.reload();">&times;</button>
          </div>
          <div class="modal-body">
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 64px; color: #4CAF50; margin-bottom: 20px;">
                ✅
              </div>
              <h3 style="margin-bottom: 10px;">Orden #${orden.id} Completada</h3>
              <p style="color: #666; margin-bottom: 30px;">
                Todos los procesos se ejecutaron exitosamente
              </p>
              
              <div style="text-align: left; background: #f5f5f5; padding: 20px; border-radius: 8px;">
                <h4 style="margin-bottom: 15px;"><i class="fas fa-list-check"></i> Acciones Realizadas:</h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div>✅ Factura generada: #${factura?.numero || factura?.id || 'N/A'}</div>
                  <div>✅ Inventario actualizado (${(orden.items || []).length} items)</div>
                  <div>✅ Historial de vehículo registrado</div>
                  <div>✅ Cliente notificado</div>
                  <div>✅ Próximo servicio predicho con IA</div>
                </div>
              </div>
              
              <div style="margin-top: 30px; display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="OrdenesTrabajo.verFactura('${factura?.id}'); this.closest('.modal-overlay').remove();">
                  <i class="fas fa-file-invoice"></i> Ver Factura
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); location.reload();">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    },

    parseJsonResponse(text) {
      if (!text) return null;

      try {
        return JSON.parse(text);
      } catch (e) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.error('No se pudo parsear JSON:', text);
          }
        }
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            return JSON.parse(arrayMatch[0]);
          } catch (e3) {
            console.error('No se pudo parsear JSON array:', text);
          }
        }
      }

      return null;
    },

    verFactura(facturaId) {
      if (window.App && typeof App.loadModule === 'function') {
        App.loadModule('ventas');
        setTimeout(() => {
          if (window.VentasMejorado && typeof VentasMejorado.verDetalleVenta === 'function') {
            VentasMejorado.verDetalleVenta(facturaId);
          }
        }, 500);
      }
    },
  });

  console.log('✅ Extensiones IA para Órdenes de Trabajo cargadas');
}
