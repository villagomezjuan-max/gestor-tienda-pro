/* ========================================
   BÚSQUEDA INTELIGENTE DEL CATÁLOGO TÉCNICO
   ======================================== */

(function () {
  const NORMALIZE_REGEXP = /[^a-z0-9\s]/g;

  function normalizarTexto(texto) {
    if (!texto) return '';
    return String(texto)
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(NORMALIZE_REGEXP, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function construirIndice(items) {
    return items.map((item) => {
      const keywords = [];
      const campos = [
        item.nombre,
        item.descripcion,
        item.categoria,
        item.subcategoria,
        item.estado,
        item.sku,
        ...(item.palabrasClave || []),
        ...(item.procedimientos || []),
        ...(item.aplicaciones || []),
      ];

      if (Array.isArray(item.compatibilidad)) {
        item.compatibilidad.forEach((ref) => {
          keywords.push(ref.marca, ref.modelo, ref.motor, ref.detalle, ref.notas);
        });
      }

      if (Array.isArray(item.proveedores)) {
        item.proveedores.forEach((prov) => {
          keywords.push(prov.nombre, prov.contacto, prov.notas, prov.ubicacion);
        });
      }

      const texto = normalizarTexto([...campos, ...keywords].join(' '));

      return {
        id: item.id,
        texto,
        tokens: texto.split(' '),
        campos: {
          nombre: normalizarTexto(item.nombre),
          categoria: normalizarTexto(item.categoria),
          subcategoria: normalizarTexto(item.subcategoria),
          sku: normalizarTexto(item.sku),
          estado: normalizarTexto(item.estado),
        },
      };
    });
  }

  function puntuarCoincidencia(indice, consultaTokens) {
    let score = 0;
    let coincidencias = 0;

    consultaTokens.forEach((token) => {
      if (!token) return;
      if (indice.campos.nombre.includes(token)) {
        score += 8;
        coincidencias += 1;
      } else if (indice.campos.sku.includes(token)) {
        score += 7;
        coincidencias += 1;
      } else if (
        indice.campos.categoria.includes(token) ||
        indice.campos.subcategoria.includes(token)
      ) {
        score += 4;
        coincidencias += 1;
      } else if (indice.texto.includes(token)) {
        score += 2;
        coincidencias += 1;
      }
    });

    // bonificación si todos los tokens encontraron correspondencia
    if (coincidencias === consultaTokens.length && coincidencias > 0) {
      score += 3;
    }

    return score;
  }

  function filtrarPorCampos(item, filtros) {
    if (!filtros) return true;

    if (filtros.categoria && item.categoria !== filtros.categoria) return false;
    if (filtros.subcategoria && item.subcategoria !== filtros.subcategoria) return false;
    if (filtros.estado && item.estado !== filtros.estado) return false;

    if (filtros.proveedor) {
      const coincideProveedor = (item.proveedores || []).some(
        (prov) => prov.nombre === filtros.proveedor || prov.id === filtros.proveedor
      );
      if (!coincideProveedor) return false;
    }

    if (filtros.compatibilidad) {
      const termino = normalizarTexto(filtros.compatibilidad);
      const coincideCompatibilidad = (item.compatibilidad || []).some((ref) => {
        return [ref.marca, ref.modelo, ref.motor, ref.detalle]
          .map(normalizarTexto)
          .some((valor) => valor.includes(termino));
      });
      if (!coincideCompatibilidad) return false;
    }

    return true;
  }

  function buscar(dataset, indice, consulta, filtros = {}) {
    const normalizado = normalizarTexto(consulta || '');
    const tokens = normalizado.split(' ').filter(Boolean);

    const resultados = dataset
      .map((item, index) => {
        if (!filtrarPorCampos(item, filtros)) {
          return null;
        }

        if (tokens.length === 0) {
          return { item, score: 1 };
        }

        const score = puntuarCoincidencia(indice[index], tokens);
        if (score <= 0) {
          return null;
        }

        return { item, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    return resultados.map((res) => res.item);
  }

  function generarSugerencias(dataset, consulta) {
    const termino = normalizarTexto(consulta || '');
    if (!termino) return [];

    const coincidencias = new Set();

    dataset.forEach((item) => {
      const campos = [
        item.nombre,
        item.categoria,
        item.subcategoria,
        item.sku,
        ...(item.palabrasClave || []),
      ];

      campos.forEach((valor) => {
        const normalizado = normalizarTexto(valor);
        if (normalizado.includes(termino)) {
          coincidencias.add(valor);
        }
      });
    });

    return Array.from(coincidencias).slice(0, 6);
  }

  window.CatalogoBuscador = {
    prepararIndice: construirIndice,
    buscar,
    sugerencias: generarSugerencias,
    normalizar: normalizarTexto,
  };
})();
