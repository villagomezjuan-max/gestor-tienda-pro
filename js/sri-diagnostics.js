(function () {
  const MAX_SAMPLES = 5;
  const SEVERITY_WEIGHT = { critical: 25, warning: 10, info: 3 };

  function safeCollection(name) {
    if (typeof Database === 'undefined' || typeof Database.getCollection !== 'function') {
      return [];
    }
    const data = Database.getCollection(name);
    return Array.isArray(data) ? data : [];
  }

  function checkIAUnifiedEngine() {
    const issues = [];

    // 1. Verificar que existe
    if (typeof window.IAUnifiedEngine === 'undefined') {
      issues.push({
        severity: 'critical',
        title: 'Motor de IA no disponible',
        message:
          'window.IAUnifiedEngine no está definido. El archivo ia-unified-engine.js no se ha cargado.',
        affected: ['Asistente IA', 'Generación automática de formularios'],
        hint: 'Verifica que ia-unified-engine.js esté incluido en index.html antes de sri-panel.js',
        ruleId: 'IA-ENGINE-001',
      });
      return issues;
    }

    console.log('🔍 Verificando estado de IAUnifiedEngine...');

    // 2. Verificar inicialización
    if (!window.IAUnifiedEngine.initialized) {
      issues.push({
        severity: 'critical',
        title: 'Motor de IA no inicializado',
        message: 'IAUnifiedEngine existe pero no se ha inicializado.',
        affected: ['Todas las funciones de IA'],
        hint: 'Recarga la página o verifica errores en la consola del navegador',
        ruleId: 'IA-ENGINE-002',
      });
    }

    // 3. Obtener estado del servidor
    const status = window.IAUnifiedEngine.getStatus ? window.IAUnifiedEngine.getStatus() : null;

    if (!status) {
      issues.push({
        severity: 'critical',
        title: 'Estado de IA no disponible',
        message: 'No se puede obtener el estado del motor de IA.',
        affected: ['Diagnóstico de IA'],
        hint: 'El motor puede estar corrupto. Recarga la página.',
        ruleId: 'IA-ENGINE-003',
      });
      return issues;
    }

    console.log('📊 Estado IAUnifiedEngine:', status);

    // 4. Verificar configuración del servidor
    if (!status.serverConfigured) {
      issues.push({
        severity: 'critical',
        title: 'IA no configurada en el servidor',
        message:
          'El backend no tiene configuración de IA. Ve a Dashboard → Configuración → Inteligencia Artificial.',
        affected: ['Asistente IA Contable', 'Procesamiento automático'],
        hint: 'Configura un proveedor de IA (Gemini recomendado) con su API Key',
        ruleId: 'IA-CONFIG-001',
      });
    }

    // 5. Verificar API Key
    if (status.serverConfigured && !status.hasApiKey) {
      issues.push({
        severity: 'critical',
        title: 'API Key no configurada',
        message: `Proveedor ${status.providerName || status.provider || 'desconocido'} seleccionado pero sin API Key.`,
        affected: ['Todas las consultas a IA'],
        hint: 'Ingresa la API Key en Dashboard → Configuración → Inteligencia Artificial',
        ruleId: 'IA-CONFIG-002',
      });
    }

    // 6. Verificar modelo seleccionado
    if (status.initialized && status.serverConfigured && status.hasApiKey && !status.model) {
      issues.push({
        severity: 'warning',
        title: 'Modelo de IA no seleccionado',
        message: 'El sistema usará el modelo por defecto del proveedor.',
        affected: ['Calidad de respuestas'],
        hint: 'Selecciona un modelo específico en la configuración de IA',
        ruleId: 'IA-CONFIG-003',
      });
    }

    // 7. Verificar modelos disponibles
    if (
      status.serverConfigured &&
      (!status.availableModels || status.availableModels.length === 0)
    ) {
      issues.push({
        severity: 'warning',
        title: 'Sin modelos disponibles',
        message: 'No se pudieron cargar los modelos del proveedor.',
        affected: ['Selección de modelo'],
        hint: 'Verifica tu API Key y la conectividad con el proveedor',
        ruleId: 'IA-CONFIG-004',
      });
    }

    // 8. Todo está bien
    if (status.initialized && status.serverConfigured && status.hasApiKey) {
      issues.push({
        severity: 'info',
        title: '✅ IA funcionando correctamente',
        message: `Proveedor: ${status.providerName || status.provider} | Modelo: ${status.model || 'por defecto'}`,
        affected: [],
        hint: '',
        ruleId: 'IA-STATUS-OK',
      });
    }

    return issues;
  }

  function checkSRIAsistenteIA() {
    const issues = [];

    if (typeof window.SRIAsistenteIA === 'undefined') {
      issues.push({
        severity: 'warning',
        title: 'Asistente IA SRI no disponible',
        message: 'El módulo SRIAsistenteIA no está cargado.',
        affected: ['Chat con asistente tributario'],
        hint: 'Verifica que sri-asistente-ia.js esté incluido en index.html',
        ruleId: 'SRI-IA-001',
      });
      return issues;
    }

    // Verificar si está habilitado
    if (window.SRIAsistenteIA.config && !window.SRIAsistenteIA.config.enabled) {
      issues.push({
        severity: 'warning',
        title: 'Asistente IA deshabilitado',
        message: 'El asistente existe pero no está habilitado.',
        affected: ['Consultas tributarias con IA'],
        hint: 'Verifica la configuración de IA en el backend',
        ruleId: 'SRI-IA-002',
      });
    } else if (window.SRIAsistenteIA.config && window.SRIAsistenteIA.config.enabled) {
      issues.push({
        severity: 'info',
        title: '✅ Asistente IA SRI habilitado',
        message: 'El asistente tributario está listo para usar.',
        affected: [],
        hint: '',
        ruleId: 'SRI-IA-OK',
      });
    }

    return issues;
  }

  function safeConfig() {
    if (typeof Database === 'undefined' || typeof Database.get !== 'function') {
      return {};
    }
    const avanzada = Database.get('configuracionAvanzada') || {};
    return avanzada.sri || {};
  }

  function normalizeIssue(baseIssue, rule) {
    if (!baseIssue) return null;
    const issue = typeof baseIssue === 'string' ? { message: baseIssue } : { ...baseIssue };
    issue.ruleId = rule.id;
    issue.severity = issue.severity || rule.severity || 'warning';
    issue.title = issue.title || rule.title;
    issue.scope = issue.scope || rule.scope;
    issue.affected = issue.affected || [];
    issue.hint = issue.hint || rule.hint || '';
    return issue;
  }

  function summarize(issues, context) {
    const totals = { critical: 0, warning: 0, info: 0 };
    issues.forEach((issue) => {
      const sev = issue.severity;
      if (totals[sev] === undefined) {
        totals.info += 1;
      } else {
        totals[sev] += 1;
      }
    });
    const penalties =
      totals.critical * SEVERITY_WEIGHT.critical +
      totals.warning * SEVERITY_WEIGHT.warning +
      totals.info * SEVERITY_WEIGHT.info;
    const score = Math.max(0, 100 - penalties);
    const sources = ['config', 'facturas', 'compras', 'retenciones'];
    const coverage = Math.round(
      (sources.reduce(
        (acc, key) =>
          acc +
          (key === 'config'
            ? Object.keys(context.config || {}).length
              ? 1
              : 0
            : context[key] && context[key].length
              ? 1
              : 0),
        0
      ) /
        sources.length) *
        100
    );
    return { ...totals, score, coverage };
  }

  const RULES = [
    // ==========================================
    // REGLAS DE IA - PRIORIDAD MÁXIMA
    // ==========================================
    {
      id: 'ia:engine',
      title: 'Verificación del Motor de IA',
      severity: 'critical',
      scope: 'ia',
      hint: 'El asistente IA requiere configuración completa',
      run(context) {
        return checkIAUnifiedEngine();
      },
    },
    {
      id: 'ia:asistente',
      title: 'Verificación Asistente SRI',
      severity: 'warning',
      scope: 'ia',
      hint: 'Verifica la inicialización del asistente',
      run(context) {
        return checkSRIAsistenteIA();
      },
    },
    // ==========================================
    // REGLAS DE CONFIGURACIÓN SRI
    // ==========================================
    {
      id: 'config:ruc',
      title: 'Configuración SRI incompleta',
      severity: 'critical',
      scope: 'config',
      hint: 'Ve a Dashboard → Configuración → pestaña SRI y completa los datos obligatorios.',
      run(context) {
        const issues = [];
        const ruc = (context.config.ruc || '').trim();
        if (!ruc) {
          issues.push({
            title: 'RUC de la empresa no configurado',
            message:
              'El módulo tributario no puede calcular plazos ni generar formularios sin un RUC válido.',
            severity: 'critical',
          });
        } else if (ruc.length !== 13) {
          issues.push({
            title: 'RUC con longitud incorrecta',
            message: 'El RUC debe contener 13 dígitos. Valor actual: ' + ruc,
            severity: 'warning',
          });
        }
        if (!context.config.razonSocial) {
          issues.push({
            title: 'Razón social faltante',
            message:
              'Configura la razón social registrada en el SRI para los encabezados de formularios.',
            severity: 'warning',
          });
        }
        if (!context.config.certificadoBase64 || !context.config.certificadoClave) {
          issues.push({
            title: 'Certificado digital no cargado',
            message: 'Sin certificado no se pueden firmar comprobantes electrónicos.',
            severity: 'critical',
          });
        }
        return issues;
      },
    },
    {
      id: 'facturas:clave-acceso',
      title: 'Facturas sin clave de acceso',
      severity: 'warning',
      scope: 'facturas',
      hint: 'Abre Facturación → selecciona la factura y genera la clave de acceso antes de enviarla al SRI.',
      run(context) {
        if (!context.facturas.length) return null;
        const invalid = context.facturas.filter(
          (factura) => !factura.claveAcceso || factura.claveAcceso.length < 40
        );
        if (!invalid.length) return null;
        const samples = invalid
          .slice(0, MAX_SAMPLES)
          .map((factura) => factura.id || factura.numero || factura.claveAcceso || 'sin-id');
        return {
          message: `${invalid.length} factura(s) no tienen clave de acceso generada o es demasiado corta.`,
          affected: samples,
          severity: 'warning',
        };
      },
    },
    {
      id: 'facturas:sin-items',
      title: 'Facturas sin detalle',
      severity: 'critical',
      scope: 'facturas',
      hint: 'Revisa las facturas listadas y agrega al menos una línea de producto antes de declararlas.',
      run(context) {
        if (!context.facturas.length) return null;
        const facturasSinDetalle = context.facturas.filter(
          (factura) =>
            !context.facturaItems[factura.id] || context.facturaItems[factura.id].length === 0
        );
        if (!facturasSinDetalle.length) return null;
        return {
          message: `${facturasSinDetalle.length} factura(s) del período no tienen items relacionados.`,
          affected: facturasSinDetalle
            .slice(0, MAX_SAMPLES)
            .map((factura) => factura.id || factura.numero || 'sin-id'),
          severity: 'critical',
        };
      },
    },
    {
      id: 'compras:proveedor',
      title: 'Compras sin RUC de proveedor',
      severity: 'warning',
      scope: 'compras',
      hint: 'Edita la compra e ingresa el RUC/Cédula del proveedor para que aparezca en el ATS.',
      run(context) {
        if (!context.compras.length) return null;
        const invalid = context.compras.filter(
          (compra) => !(compra.proveedorRuc || compra.proveedorIdentificacion)
        );
        if (!invalid.length) return null;
        return {
          message: `${invalid.length} compra(s) no tienen identificación de proveedor.`,
          affected: invalid
            .slice(0, MAX_SAMPLES)
            .map((compra) => compra.id || compra.numero || 'sin-id'),
          severity: 'warning',
        };
      },
    },
    {
      id: 'retenciones:items',
      title: 'Retenciones sin códigos',
      severity: 'critical',
      scope: 'retenciones',
      hint: 'Edita la retención y asigna códigos SRI (303, 304, etc.) con su porcentaje.',
      run(context) {
        if (!context.retenciones.length) return null;
        const invalid = context.retenciones.filter((retencion) => {
          const items = context.retencionItems[retencion.id] || [];
          return !items.length || items.some((item) => !item.codigo || !item.porcentaje);
        });
        if (!invalid.length) return null;
        return {
          message: `${invalid.length} retención(es) tienen items sin código o porcentaje.`,
          affected: invalid
            .slice(0, MAX_SAMPLES)
            .map((retencion) => retencion.id || retencion.numeroRetencion || 'sin-id'),
          severity: 'critical',
        };
      },
    },
    {
      id: 'datos:periodos',
      title: 'Movimientos sin período',
      severity: 'info',
      scope: 'general',
      hint: 'Asegúrate de registrar fechas válidas para que el motor pueda filtrar por mes al generar formularios.',
      run(context) {
        const sinFecha = [];
        const revisarFecha = (coleccion, tipo) => {
          coleccion.forEach((item) => {
            if (!item.fecha && !item.fechaEmision && !item.createdAt) {
              sinFecha.push({ tipo, id: item.id || item.numero || 'sin-id' });
            }
          });
        };
        revisarFecha(context.facturas, 'Factura');
        revisarFecha(context.compras, 'Compra');
        revisarFecha(context.retenciones, 'Retención');
        if (!sinFecha.length) return null;
        return {
          message: `${sinFecha.length} documento(s) carecen de fecha registrada, lo que impide asignarlos a un período tributario.`,
          affected: sinFecha.slice(0, MAX_SAMPLES).map((item) => `${item.tipo}: ${item.id}`),
          severity: 'info',
        };
      },
    },
  ];

  function buildContext() {
    const facturas = safeCollection('facturas');
    const retenciones = safeCollection('retenciones');
    const compras = safeCollection('compras');
    const facturaItems = groupById(safeCollection('facturaItems'), 'facturaId');
    const retencionItems = groupById(safeCollection('retencionItems'), 'retencionId');
    return {
      config: safeConfig(),
      facturas,
      compras,
      retenciones,
      facturaItems,
      retencionItems,
    };
  }

  function groupById(collection, key) {
    return collection.reduce((acc, item) => {
      const id = item[key];
      if (!id) return acc;
      if (!acc[id]) acc[id] = [];
      acc[id].push(item);
      return acc;
    }, {});
  }

  const SRILintEngine = {
    analyze() {
      const context = buildContext();
      const issues = [];
      RULES.forEach((rule) => {
        try {
          const result = rule.run(context);
          if (!result) return;
          if (Array.isArray(result)) {
            result.forEach((issue) => {
              const normalized = normalizeIssue(issue, rule);
              if (normalized) issues.push(normalized);
            });
          } else {
            const normalized = normalizeIssue(result, rule);
            if (normalized) issues.push(normalized);
          }
        } catch (error) {
          console.error('[SRILint] Error ejecutando regla', rule.id, error);
        }
      });
      const stats = summarize(issues, context);
      return { issues, stats, timestamp: new Date().toISOString() };
    },
  };

  window.SRILintEngine = SRILintEngine;
})();
