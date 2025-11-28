/* ========================================
   SISTEMA DE VALIDADORES ECUADOR
   Validaciones para RUC, Cédula, Email, Teléfono
   Cumplimiento normativa SRI Ecuador
   ======================================== */

class EcuadorValidators {
  /**
   * Valida RUC ecuatoriano (13 dígitos)
   * Tipos: Persona Natural, Sociedades Privadas, Públicas
   */
  static validarRUC(ruc) {
    // Eliminar espacios y guiones
    ruc = (ruc || '').toString().trim().replace(/[-\s]/g, '');

    const resultado = {
      valido: false,
      tipo: null,
      mensaje: '',
      ruc: ruc,
    };

    // Verificar longitud
    if (ruc.length !== 13) {
      resultado.mensaje = 'El RUC debe tener 13 dígitos';
      return resultado;
    }

    // Verificar que sean solo números
    if (!/^\d+$/.test(ruc)) {
      resultado.mensaje = 'El RUC debe contener solo números';
      return resultado;
    }

    // Obtener código de provincia (2 primeros dígitos)
    const provincia = parseInt(ruc.substring(0, 2));

    // Validar código de provincia (01 a 24)
    if (provincia < 1 || provincia > 24) {
      resultado.mensaje = 'Código de provincia inválido';
      return resultado;
    }

    // Tercer dígito determina el tipo de RUC
    const tercerDigito = parseInt(ruc.charAt(2));

    // Persona Natural (tercer dígito < 6)
    if (tercerDigito < 6) {
      resultado.tipo = 'Persona Natural';
      resultado.valido = this._validarRUCPersonaNatural(ruc);
      resultado.mensaje = resultado.valido
        ? 'RUC de Persona Natural válido'
        : 'RUC de Persona Natural inválido (dígito verificador incorrecto)';
    }
    // Sociedad Pública (tercer dígito = 6)
    else if (tercerDigito === 6) {
      resultado.tipo = 'Sociedad Pública';
      resultado.valido = this._validarRUCSociedadPublica(ruc);
      resultado.mensaje = resultado.valido
        ? 'RUC de Sociedad Pública válido'
        : 'RUC de Sociedad Pública inválido (dígito verificador incorrecto)';
    }
    // Sociedad Privada (tercer dígito = 9)
    else if (tercerDigito === 9) {
      resultado.tipo = 'Sociedad Privada';
      resultado.valido = this._validarRUCSociedadPrivada(ruc);
      resultado.mensaje = resultado.valido
        ? 'RUC de Sociedad Privada válido'
        : 'RUC de Sociedad Privada inválido (dígito verificador incorrecto)';
    } else {
      resultado.mensaje = 'Tercer dígito inválido';
    }

    // Validar que los últimos 3 dígitos sean 001 o mayor
    const establecimiento = parseInt(ruc.substring(10, 13));
    if (establecimiento < 1) {
      resultado.valido = false;
      resultado.mensaje = 'Código de establecimiento inválido (debe ser 001 o mayor)';
    }

    return resultado;
  }

  /**
   * Valida RUC de Persona Natural (algoritmo módulo 10)
   */
  static _validarRUCPersonaNatural(ruc) {
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(ruc.charAt(i)) * coeficientes[i];
      if (valor >= 10) {
        valor = valor - 9;
      }
      suma += valor;
    }

    const digitoVerificador = parseInt(ruc.charAt(9));
    let modulo = suma % 10;
    let resultado = modulo === 0 ? 0 : 10 - modulo;

    return resultado === digitoVerificador;
  }

  /**
   * Valida RUC de Sociedad Pública (algoritmo módulo 11)
   */
  static _validarRUCSociedadPublica(ruc) {
    const coeficientes = [3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;

    for (let i = 0; i < 8; i++) {
      suma += parseInt(ruc.charAt(i)) * coeficientes[i];
    }

    const digitoVerificador = parseInt(ruc.charAt(8));
    let modulo = suma % 11;
    let resultado = modulo === 0 ? 0 : 11 - modulo;

    return resultado === digitoVerificador;
  }

  /**
   * Valida RUC de Sociedad Privada (algoritmo módulo 11)
   */
  static _validarRUCSociedadPrivada(ruc) {
    const coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      suma += parseInt(ruc.charAt(i)) * coeficientes[i];
    }

    const digitoVerificador = parseInt(ruc.charAt(9));
    let modulo = suma % 11;
    let resultado = modulo === 0 ? 0 : 11 - modulo;

    return resultado === digitoVerificador;
  }

  /**
   * Valida cédula ecuatoriana (10 dígitos)
   */
  static validarCedula(cedula) {
    cedula = (cedula || '').toString().trim().replace(/[-\s]/g, '');

    const resultado = {
      valido: false,
      mensaje: '',
      cedula: cedula,
    };

    // Verificar longitud
    if (cedula.length !== 10) {
      resultado.mensaje = 'La cédula debe tener 10 dígitos';
      return resultado;
    }

    // Verificar que sean solo números
    if (!/^\d+$/.test(cedula)) {
      resultado.mensaje = 'La cédula debe contener solo números';
      return resultado;
    }

    // Obtener código de provincia
    const provincia = parseInt(cedula.substring(0, 2));

    // Validar código de provincia (01 a 24)
    if (provincia < 1 || provincia > 24) {
      resultado.mensaje = 'Código de provincia inválido';
      return resultado;
    }

    // Validar tercer dígito (debe ser menor a 6)
    const tercerDigito = parseInt(cedula.charAt(2));
    if (tercerDigito >= 6) {
      resultado.mensaje = 'Tercer dígito inválido';
      return resultado;
    }

    // Algoritmo módulo 10
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula.charAt(i)) * coeficientes[i];
      if (valor >= 10) {
        valor = valor - 9;
      }
      suma += valor;
    }

    const digitoVerificador = parseInt(cedula.charAt(9));
    let modulo = suma % 10;
    let calculado = modulo === 0 ? 0 : 10 - modulo;

    resultado.valido = calculado === digitoVerificador;
    resultado.mensaje = resultado.valido
      ? 'Cédula válida'
      : 'Cédula inválida (dígito verificador incorrecto)';

    return resultado;
  }

  /**
   * Valida email
   */
  static validarEmail(email) {
    email = (email || '').toString().trim();

    const resultado = {
      valido: false,
      mensaje: '',
      email: email,
    };

    if (!email) {
      resultado.mensaje = 'Email es requerido';
      return resultado;
    }

    // Expresión regular para validar email
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    resultado.valido = regex.test(email);
    resultado.mensaje = resultado.valido ? 'Email válido' : 'Email inválido';

    // Validaciones adicionales
    if (resultado.valido) {
      // Verificar longitud máxima
      if (email.length > 100) {
        resultado.valido = false;
        resultado.mensaje = 'Email demasiado largo (máximo 100 caracteres)';
      }

      // Verificar caracteres consecutivos
      if (email.includes('..') || email.includes('@@')) {
        resultado.valido = false;
        resultado.mensaje = 'Email contiene caracteres consecutivos inválidos';
      }
    }

    return resultado;
  }

  /**
   * Valida teléfono ecuatoriano
   * Formatos aceptados:
   * - Móvil: 09XXXXXXXX (10 dígitos)
   * - Fijo: 0XXXXXXXX (9 dígitos)
   * - Con código país: +593XXXXXXXXX
   */
  static validarTelefono(telefono) {
    telefono = (telefono || '').toString().trim();

    const resultado = {
      valido: false,
      tipo: null,
      mensaje: '',
      telefono: telefono,
      telefonoFormateado: '',
    };

    if (!telefono) {
      resultado.mensaje = 'Teléfono es requerido';
      return resultado;
    }

    // Limpiar caracteres especiales
    let telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '');

    // Con código de país
    if (telefonoLimpio.startsWith('+593')) {
      telefonoLimpio = '0' + telefonoLimpio.substring(4);
    } else if (telefonoLimpio.startsWith('593')) {
      telefonoLimpio = '0' + telefonoLimpio.substring(3);
    }

    // Verificar que sean solo números
    if (!/^0\d+$/.test(telefonoLimpio)) {
      resultado.mensaje = 'Teléfono debe empezar con 0 y contener solo números';
      return resultado;
    }

    // Móvil (10 dígitos, empieza con 09)
    if (telefonoLimpio.length === 10 && telefonoLimpio.startsWith('09')) {
      resultado.valido = true;
      resultado.tipo = 'Móvil';
      resultado.mensaje = 'Teléfono móvil válido';
      resultado.telefonoFormateado = '+593' + telefonoLimpio.substring(1);
    }
    // Fijo (9 dígitos, empieza con 0 pero no 09)
    else if (
      telefonoLimpio.length === 9 &&
      telefonoLimpio.startsWith('0') &&
      !telefonoLimpio.startsWith('09')
    ) {
      resultado.valido = true;
      resultado.tipo = 'Fijo';
      resultado.mensaje = 'Teléfono fijo válido';
      resultado.telefonoFormateado = '+593' + telefonoLimpio.substring(1);
    } else {
      resultado.mensaje =
        'Formato de teléfono inválido (debe ser 09XXXXXXXX para móvil o 0XXXXXXXX para fijo)';
    }

    return resultado;
  }

  /**
   * Valida dirección (no vacía y longitud mínima)
   */
  static validarDireccion(direccion) {
    direccion = (direccion || '').toString().trim();

    const resultado = {
      valido: false,
      mensaje: '',
      direccion: direccion,
    };

    if (!direccion) {
      resultado.mensaje = 'Dirección es requerida';
      return resultado;
    }

    if (direccion.length < 10) {
      resultado.mensaje = 'Dirección debe tener al menos 10 caracteres';
      return resultado;
    }

    if (direccion.length > 200) {
      resultado.mensaje = 'Dirección demasiado larga (máximo 200 caracteres)';
      return resultado;
    }

    resultado.valido = true;
    resultado.mensaje = 'Dirección válida';

    return resultado;
  }

  /**
   * Valida razón social
   */
  static validarRazonSocial(razonSocial) {
    razonSocial = (razonSocial || '').toString().trim();

    const resultado = {
      valido: false,
      mensaje: '',
      razonSocial: razonSocial,
    };

    if (!razonSocial) {
      resultado.mensaje = 'Razón social es requerida';
      return resultado;
    }

    if (razonSocial.length < 3) {
      resultado.mensaje = 'Razón social debe tener al menos 3 caracteres';
      return resultado;
    }

    if (razonSocial.length > 150) {
      resultado.mensaje = 'Razón social demasiado larga (máximo 150 caracteres)';
      return resultado;
    }

    resultado.valido = true;
    resultado.mensaje = 'Razón social válida';

    return resultado;
  }

  /**
   * Obtiene provincias de Ecuador
   */
  static getProvincias() {
    return [
      { codigo: '01', nombre: 'Azuay' },
      { codigo: '02', nombre: 'Bolívar' },
      { codigo: '03', nombre: 'Cañar' },
      { codigo: '04', nombre: 'Carchi' },
      { codigo: '05', nombre: 'Cotopaxi' },
      { codigo: '06', nombre: 'Chimborazo' },
      { codigo: '07', nombre: 'El Oro' },
      { codigo: '08', nombre: 'Esmeraldas' },
      { codigo: '09', nombre: 'Guayas' },
      { codigo: '10', nombre: 'Imbabura' },
      { codigo: '11', nombre: 'Loja' },
      { codigo: '12', nombre: 'Los Ríos' },
      { codigo: '13', nombre: 'Manabí' },
      { codigo: '14', nombre: 'Morona Santiago' },
      { codigo: '15', nombre: 'Napo' },
      { codigo: '16', nombre: 'Pastaza' },
      { codigo: '17', nombre: 'Pichincha' },
      { codigo: '18', nombre: 'Tungurahua' },
      { codigo: '19', nombre: 'Zamora Chinchipe' },
      { codigo: '20', nombre: 'Galápagos' },
      { codigo: '21', nombre: 'Sucumbíos' },
      { codigo: '22', nombre: 'Orellana' },
      { codigo: '23', nombre: 'Santo Domingo de los Tsáchilas' },
      { codigo: '24', nombre: 'Santa Elena' },
    ];
  }

  /**
   * Valida código de establecimiento (001-999)
   */
  static validarCodigoEstablecimiento(codigo) {
    codigo = (codigo || '').toString().trim();

    const resultado = {
      valido: false,
      mensaje: '',
      codigo: codigo,
    };

    if (!codigo) {
      resultado.mensaje = 'Código de establecimiento es requerido';
      return resultado;
    }

    if (!/^\d{3}$/.test(codigo)) {
      resultado.mensaje = 'Código debe tener exactamente 3 dígitos';
      return resultado;
    }

    const codigoNum = parseInt(codigo);
    if (codigoNum < 1 || codigoNum > 999) {
      resultado.mensaje = 'Código debe estar entre 001 y 999';
      return resultado;
    }

    resultado.valido = true;
    resultado.mensaje = 'Código de establecimiento válido';
    resultado.codigoFormateado = codigo.padStart(3, '0');

    return resultado;
  }

  /**
   * Formatea RUC con guiones para mejor lectura
   */
  static formatearRUC(ruc) {
    ruc = ruc.toString().replace(/[-\s]/g, '');
    if (ruc.length === 13) {
      return `${ruc.substring(0, 10)}-${ruc.substring(10, 13)}`;
    }
    return ruc;
  }

  /**
   * Formatea cédula con guiones
   */
  static formatearCedula(cedula) {
    cedula = cedula.toString().replace(/[-\s]/g, '');
    if (cedula.length === 10) {
      return `${cedula.substring(0, 10)}`;
    }
    return cedula;
  }

  /**
   * Formatea teléfono
   */
  static formatearTelefono(telefono) {
    const validacion = this.validarTelefono(telefono);
    return validacion.valido ? validacion.telefonoFormateado : telefono;
  }
}

// Exponer globalmente
window.EcuadorValidators = EcuadorValidators;

// Función de prueba rápida
window.testValidators = function () {
  console.log('🧪 PROBANDO VALIDADORES ECUADOR');
  console.log('================================');

  // Probar RUC
  console.log('\n📋 RUC:');
  console.log(EcuadorValidators.validarRUC('1234567890001')); // Ejemplo

  // Probar Cédula
  console.log('\n🆔 CÉDULA:');
  console.log(EcuadorValidators.validarCedula('1234567890')); // Ejemplo

  // Probar Email
  console.log('\n📧 EMAIL:');
  console.log(EcuadorValidators.validarEmail('test@example.com'));

  // Probar Teléfono
  console.log('\n📱 TELÉFONO:');
  console.log(EcuadorValidators.validarTelefono('0987654321'));

  console.log('\n✅ Validadores cargados correctamente');
};

console.log('✅ Sistema de validadores Ecuador cargado');
console.log('Usa testValidators() para probar las validaciones');
