// ============================================
// MÓDULO: IMPORTADOR CSV/JSON
// ============================================
// Importación masiva de productos, clientes y proveedores

window.Importador = {
  // ============================================
  // RENDERIZAR VISTA PRINCIPAL
  // ============================================
  render(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2><i class="fas fa-file-import"></i> Importación Masiva de Datos</h2>
      </div>

      <!-- Plantillas CSV -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-download"></i> Descargar Plantillas CSV</h3>
        </div>
        <div class="card-body">
          <p>Descarga las plantillas para importar datos correctamente</p>
          <div class="plantillas-grid">
            <button class="btn btn-primary" onclick="Importador.descargarPlantilla('productos')">
              <i class="fas fa-download"></i> Plantilla Productos
            </button>
            <button class="btn btn-primary" onclick="Importador.descargarPlantilla('clientes')">
              <i class="fas fa-download"></i> Plantilla Clientes
            </button>
            <button class="btn btn-primary" onclick="Importador.descargarPlantilla('proveedores')">
              <i class="fas fa-download"></i> Plantilla Proveedores
            </button>
          </div>
        </div>
      </div>

      <!-- Importar desde CSV -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-file-csv"></i> Importar desde CSV</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label>Tipo de Datos</label>
            <select id="tipoImportacion" class="form-control">
              <option value="productos">Productos</option>
              <option value="clientes">Clientes</option>
              <option value="proveedores">Proveedores</option>
            </select>
          </div>

          <div class="form-group">
            <label>Archivo CSV</label>
            <input type="file" id="fileCSV" accept=".csv" class="form-control">
          </div>

          <button class="btn btn-success" onclick="Importador.importarCSV()">
            <i class="fas fa-upload"></i> Importar Datos
          </button>
        </div>
      </div>

      <!-- Exportar a CSV -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i class="fas fa-file-export"></i> Exportar a CSV</h3>
        </div>
        <div class="card-body">
          <p>Exporta tus datos actuales en formato CSV</p>
          <div class="plantillas-grid">
            <button class="btn btn-secondary" onclick="Importador.exportarCSV('productos')">
              <i class="fas fa-file-export"></i> Exportar Productos
            </button>
            <button class="btn btn-secondary" onclick="Importador.exportarCSV('clientes')">
              <i class="fas fa-file-export"></i> Exportar Clientes
            </button>
            <button class="btn btn-secondary" onclick="Importador.exportarCSV('proveedores')">
              <i class="fas fa-file-export"></i> Exportar Proveedores
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // ============================================
  // DESCARGAR PLANTILLAS CSV
  // ============================================
  descargarPlantilla(tipo) {
    let csv = '';
    let filename = '';

    switch (tipo) {
      case 'productos':
        csv = 'codigo,nombre,categoria,precioCompra,precioVenta,stock,stockMinimo,descripcion\n';
        csv += 'PROD-001,Producto Ejemplo,Categoría,10.00,15.00,50,10,Descripción del producto\n';
        csv += 'PROD-002,Otro Producto,Categoría,20.00,30.00,30,5,Otra descripción';
        filename = 'plantilla_productos.csv';
        break;

      case 'clientes':
        csv = 'nombre,cedula,telefono,email,direccion,ciudad,limiteCredito,categoria\n';
        csv +=
          'Juan Pérez,1234567890,0999999999,juan@email.com,Av. Principal #123,Quito,500.00,Regular\n';
        csv += 'María López,0987654321,0988888888,maria@email.com,Calle 123,Guayaquil,1000.00,VIP';
        filename = 'plantilla_clientes.csv';
        break;

      case 'proveedores':
        csv = 'nombre,ruc,contacto,telefono,email,direccion,ciudad,formaPago,calificacion\n';
        csv +=
          'Proveedor ABC,1234567890001,Carlos Gómez,0999777888,ventas@abc.com,Zona Industrial,Quito,Transferencia,5\n';
        csv +=
          'Distribuidora XYZ,9876543210001,Ana Torres,0988666777,info@xyz.com,Centro,Guayaquil,Crédito,4';
        filename = 'plantilla_proveedores.csv';
        break;
    }

    this.descargarArchivo(csv, filename, 'text/csv');
    Utils.showToast('Plantilla descargada', 'success');
  },

  // ============================================
  // IMPORTAR DESDE CSV
  // ============================================
  async importarCSV() {
    const tipo = document.getElementById('tipoImportacion').value;
    const fileInput = document.getElementById('fileCSV');
    const file = fileInput.files[0];

    if (!file) {
      Utils.showToast('Selecciona un archivo CSV', 'warning');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const datos = this.parseCSV(csv);

        if (datos.length === 0) {
          Utils.showToast('El archivo está vacío', 'error');
          return;
        }

        // Mostrar vista previa
        this.mostrarVistaPrevia(datos, tipo);
      } catch (error) {
        Utils.showToast('Error al leer el archivo CSV', 'error');
        console.error(error);
      }
    };

    reader.readAsText(file);
    fileInput.value = '';
  },

  // ============================================
  // PARSEAR CSV
  // ============================================
  parseCSV(csv) {
    const lines = csv.split('\n').filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const datos = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });

      datos.push(obj);
    }

    return datos;
  },

  // ============================================
  // VISTA PREVIA DE IMPORTACIÓN
  // ============================================
  mostrarVistaPrevia(datos, tipo) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalVistaPrevia';
    modal.innerHTML = `
      <div class="modal-container modal-large">
        <div class="modal-header">
          <h3><i class="fas fa-eye"></i> Vista Previa de Importación</h3>
          <button class="btn-close" onclick="document.getElementById('modalVistaPrevia').remove()">×</button>
        </div>
        <div class="modal-body">
          <p><strong>Tipo:</strong> ${tipo}</p>
          <p><strong>Registros a importar:</strong> ${datos.length}</p>

          <div class="form-group">
            <label>
              <input type="radio" name="modoImportar" value="agregar" checked> 
              Agregar nuevos (mantener existentes)
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="radio" name="modoImportar" value="reemplazar"> 
              Reemplazar todos (eliminar existentes)
            </label>
          </div>

          <h4>Primeros 5 registros:</h4>
          <div class="preview-table">
            <table class="table">
              <thead>
                <tr>
                  ${Object.keys(datos[0])
                    .map((key) => `<th>${key}</th>`)
                    .join('')}
                </tr>
              </thead>
              <tbody>
                ${datos
                  .slice(0, 5)
                  .map(
                    (item) => `
                  <tr>
                    ${Object.values(item)
                      .map((val) => `<td>${val}</td>`)
                      .join('')}
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('modalVistaPrevia').remove()">
            Cancelar
          </button>
          <button class="btn btn-success" onclick="Importador.confirmarImportacion()">
            <i class="fas fa-check"></i> Confirmar Importación
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Guardar datos temporales
    this.datosTemp = datos;
    this.tipoTemp = tipo;
  },

  // ============================================
  // CONFIRMAR IMPORTACIÓN
  // ============================================
  confirmarImportacion() {
    const modo = document.querySelector('input[name="modoImportar"]:checked').value;
    const datos = this.datosTemp;
    const tipo = this.tipoTemp;

    let exitosos = 0;
    let errores = 0;

    // Si es reemplazar, limpiar colección
    if (modo === 'reemplazar') {
      Database.setCollection(tipo, []);
    }

    // Importar datos según el tipo
    datos.forEach((item) => {
      try {
        const obj = this.convertirAObjeto(item, tipo);
        Database.add(tipo, obj);
        exitosos++;
      } catch (error) {
        console.error('Error importando:', error);
        errores++;
      }
    });

    document.getElementById('modalVistaPrevia').remove();

    Utils.showToast(
      `Importación completada: ${exitosos} exitosos, ${errores} errores`,
      exitosos > 0 ? 'success' : 'error'
    );

    // Recargar módulo correspondiente
    setTimeout(() => {
      App.loadModule(tipo);
    }, 1500);
  },

  // ============================================
  // CONVERTIR DATOS A OBJETO
  // ============================================
  convertirAObjeto(item, tipo) {
    const obj = {
      id: Utils.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    switch (tipo) {
      case 'productos':
        obj.codigo = item.codigo || 'PROD-' + Utils.generateId().slice(0, 8);
        obj.nombre = item.nombre;
        obj.categoria = item.categoria || 'Otros';
        obj.precioCompra = parseFloat(item.precioCompra) || 0;
        obj.precioVenta = parseFloat(item.precioVenta) || 0;
        obj.stock = parseInt(item.stock) || 0;
        obj.stockMinimo = parseInt(item.stockMinimo) || 0;
        obj.descripcion = item.descripcion || '';
        break;

      case 'clientes':
        obj.nombre = item.nombre;
        obj.cedula = item.cedula || '';
        obj.telefono = item.telefono || '';
        obj.email = item.email || '';
        obj.direccion = item.direccion || '';
        obj.ciudad = item.ciudad || '';
        obj.pais = 'Ecuador';
        obj.tipo = 'persona';
        obj.categoria = item.categoria || 'Nuevo';
        obj.limiteCredito = parseFloat(item.limiteCredito) || 0;
        obj.totalComprado = 0;
        obj.numeroCompras = 0;
        obj.saldoPendiente = 0;
        obj.activo = true;
        break;

      case 'proveedores':
        obj.nombre = item.nombre;
        obj.ruc = item.ruc || '';
        obj.contacto = item.contacto || '';
        obj.telefono = item.telefono || '';
        obj.email = item.email || '';
        obj.direccion = item.direccion || '';
        obj.ciudad = item.ciudad || '';
        obj.pais = 'Ecuador';
        obj.formaPago = item.formaPago || 'Efectivo';
        obj.diasEntrega = parseInt(item.diasEntrega) || 7;
        obj.plazoCredito = parseInt(item.plazoCredito) || 30;
        obj.calificacion = parseInt(item.calificacion) || 0;
        obj.productosSuministrados = [];
        obj.totalComprado = 0;
        obj.numeroCompras = 0;
        obj.saldoPendiente = 0;
        obj.activo = true;
        break;
    }

    return obj;
  },

  // ============================================
  // EXPORTAR A CSV
  // ============================================
  exportarCSV(tipo) {
    const datos = Database.getCollection(tipo);

    if (datos.length === 0) {
      Utils.showToast('No hay datos para exportar', 'warning');
      return;
    }

    let csv = '';
    let filename = '';

    switch (tipo) {
      case 'productos':
        csv = 'codigo,nombre,categoria,precioCompra,precioVenta,stock,stockMinimo,descripcion\n';
        datos.forEach((p) => {
          csv += `${p.codigo},${p.nombre},${p.categoria},${p.precioCompra},${p.precioVenta},${p.stock},${p.stockMinimo},"${p.descripcion || ''}"\n`;
        });
        filename = `productos_${Utils.getCurrentDate()}.csv`;
        break;

      case 'clientes':
        csv =
          'nombre,cedula,telefono,email,direccion,ciudad,limiteCredito,categoria,totalComprado\n';
        datos.forEach((c) => {
          csv += `${c.nombre},${c.cedula || ''},${c.telefono || ''},${c.email || ''},${c.direccion || ''},${c.ciudad || ''},${c.limiteCredito},${c.categoria},${c.totalComprado || 0}\n`;
        });
        filename = `clientes_${Utils.getCurrentDate()}.csv`;
        break;

      case 'proveedores':
        csv =
          'nombre,ruc,contacto,telefono,email,direccion,ciudad,formaPago,calificacion,totalComprado\n';
        datos.forEach((p) => {
          csv += `${p.nombre},${p.ruc || ''},${p.contacto || ''},${p.telefono || ''},${p.email || ''},${p.direccion || ''},${p.ciudad || ''},${p.formaPago},${p.calificacion},${p.totalComprado || 0}\n`;
        });
        filename = `proveedores_${Utils.getCurrentDate()}.csv`;
        break;
    }

    this.descargarArchivo(csv, filename, 'text/csv');
    Utils.showToast('Datos exportados a CSV', 'success');
  },

  // ============================================
  // UTILIDADES
  // ============================================
  descargarArchivo(contenido, filename, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  },
};
