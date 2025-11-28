/* ========================================
   CONFIGURACIÓN CENTRAL DE PRECIOS Y MÁRGENES
   Define plantillas reutilizables para márgenes y códigos de descuento
   ======================================== */
(function initPricingConfig() {
  // Plantillas por defecto (se sobreescriben si hay configuración guardada)
  let marginTemplates = [
    {
      id: 'retail_plus',
      label: 'Cliente final (35%)',
      margin: 35,
      description: 'Margen estándar para mostrador y ventas minoristas.',
    },
    {
      id: 'retail_base',
      label: 'Retail liviano (30%)',
      margin: 30,
      description: 'Usar para promociones o productos de rotación media.',
    },
    {
      id: 'mayorista',
      label: 'Mayorista (20%)',
      margin: 20,
      description: 'Distribuidores y clientes con volumen alto.',
    },
    {
      id: 'corporativo',
      label: 'Corporativo (25%)',
      margin: 25,
      description: 'Empresas con convenios o licitaciones.',
    },
    {
      id: 'vip_codigo',
      label: 'Cliente con código (15%)',
      margin: 15,
      requiresCode: true,
      code: 'VIP15',
      description: 'Clientes VIP con código de descuento validado en POS.',
    },
  ];

  let discountCodes = [
    { code: 'VIP15', label: 'VIP 15%', discountPercent: 15, marginTemplate: 'vip_codigo' },
    { code: 'FAMILIA10', label: 'Familia 10%', discountPercent: 10 },
    { code: 'STAFF20', label: 'Staff interno 20%', discountPercent: 20, restrictTo: 'empleados' },
  ];

  // Intentar cargar configuración guardada
  const loadSavedConfig = () => {
    try {
      const savedConfig = localStorage.getItem('configuracionAvanzada');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.ventas?.marginTemplates?.length) {
          marginTemplates = parsed.ventas.marginTemplates;
        }
        if (parsed.ventas?.discountCodes?.length) {
          discountCodes = parsed.ventas.discountCodes;
        }
      }
    } catch (error) {
      console.warn('[PricingConfig] No se pudo cargar configuración guardada:', error);
    }
  };

  // Cargar al iniciar
  if (typeof localStorage !== 'undefined') {
    loadSavedConfig();
  }

  const config = {
    defaultTemplate: 'retail_plus',
    get marginTemplates() {
      return marginTemplates;
    },
    set marginTemplates(value) {
      if (Array.isArray(value)) marginTemplates = value;
    },
    get discountCodes() {
      return discountCodes;
    },
    set discountCodes(value) {
      if (Array.isArray(value)) discountCodes = value;
    },

    findTemplate(templateId) {
      return marginTemplates.find((tpl) => tpl.id === templateId) || null;
    },

    findDiscountByCode(code) {
      if (!code) return null;
      const normalized = code.trim().toUpperCase();
      return discountCodes.find((entry) => entry.code.toUpperCase() === normalized) || null;
    },

    // Calcular precio de venta basado en precio de compra y margen
    calculateSalePrice(purchasePrice, marginPercent) {
      const price = parseFloat(purchasePrice) || 0;
      const margin = parseFloat(marginPercent) || 0;
      return Math.round(price * (1 + margin / 100) * 100) / 100;
    },

    // Calcular margen basado en precio de compra y venta
    calculateMargin(purchasePrice, salePrice) {
      const purchase = parseFloat(purchasePrice) || 0;
      const sale = parseFloat(salePrice) || 0;
      if (purchase <= 0) return 0;
      return Math.round(((sale - purchase) / purchase) * 100 * 10) / 10;
    },

    // Aplicar código de descuento a un precio
    applyDiscountCode(code, originalPrice) {
      const discount = this.findDiscountByCode(code);
      if (!discount) return { valid: false, price: originalPrice, message: 'Código no válido' };

      const discountAmount = originalPrice * (discount.discountPercent / 100);
      const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;

      return {
        valid: true,
        price: finalPrice,
        discount: discountAmount,
        percent: discount.discountPercent,
        label: discount.label,
        message: `${discount.label}: -${discount.discountPercent}%`,
      };
    },

    // Recargar configuración desde localStorage
    reload() {
      loadSavedConfig();
    },
  };

  if (typeof window !== 'undefined') {
    window.PricingConfig = config;
  }
})();
