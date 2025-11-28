/* ========================================
   CATÁLOGO DE VEHÍCULOS - ECUADOR
   Marcas y modelos populares de 1995-2025
   ======================================== */

const CatalogoVehiculosEcuador = {
  // Catálogo completo de marcas y modelos vendidos en Ecuador
  catalogo: {
    Chevrolet: {
      modelos: [
        'Aveo',
        'Spark',
        'Sail',
        'Cruze',
        'Optra',
        'Grand Vitara',
        'Tracker',
        'Captiva',
        'Trailblazer',
        'D-Max',
        'Luv',
        'Colorado',
        'N300',
        'N400',
        'Silverado',
        'Corsa',
        'Astra',
        'Vitara',
        'Trooper',
        'Esteem',
      ],
      pais: 'EE.UU.',
      popular: true,
    },
    Toyota: {
      modelos: [
        'Corolla',
        'Yaris',
        'Hilux',
        'Land Cruiser',
        'Prado',
        'RAV4',
        'Fortuner',
        'Avanza',
        'Rush',
        'Hiace',
        'Camry',
        'Prius',
        'Tercel',
        'Starlet',
        'Corona',
        '4Runner',
        'Tacoma',
        'FJ Cruiser',
      ],
      pais: 'Japón',
      popular: true,
    },
    Kia: {
      modelos: [
        'Rio',
        'Picanto',
        'Sportage',
        'Sorento',
        'Soul',
        'Cerato',
        'Seltos',
        'Stonic',
        'Carnival',
        'K3',
        'K5',
        'Optima',
        'Forte',
        'Niro',
        'Telluride',
        'Mohave',
      ],
      pais: 'Corea del Sur',
      popular: true,
    },
    Hyundai: {
      modelos: [
        'Accent',
        'i10',
        'i20',
        'i25',
        'Elantra',
        'Tucson',
        'Santa Fe',
        'Creta',
        'Venue',
        'Kona',
        'Palisade',
        'Sonata',
        'Veloster',
        'H1',
        'H100',
        'Grand i10',
        'Atos',
        'Getz',
        'Matrix',
      ],
      pais: 'Corea del Sur',
      popular: true,
    },
    Mazda: {
      modelos: [
        '2',
        '3',
        '6',
        'CX-3',
        'CX-5',
        'CX-9',
        'BT-50',
        'CX-30',
        '626',
        'Allegro',
        'Demio',
        'Tribute',
        'B2200',
        'B2600',
        'MX-5',
        'RX-8',
        'MPV',
      ],
      pais: 'Japón',
      popular: true,
    },
    Nissan: {
      modelos: [
        'Sentra',
        'Versa',
        'Kicks',
        'X-Trail',
        'Pathfinder',
        'Frontier',
        'Navara',
        'Qashqai',
        'Rogue',
        'Altima',
        'Murano',
        'Maxima',
        'Tiida',
        'Note',
        'Juke',
        'Patrol',
        'Armada',
        'Urvan',
        'V-Drive',
      ],
      pais: 'Japón',
      popular: true,
    },
    Ford: {
      modelos: [
        'Fiesta',
        'Focus',
        'Fusion',
        'Escape',
        'Explorer',
        'Expedition',
        'Ranger',
        'F-150',
        'F-250',
        'F-350',
        'EcoSport',
        'Territory',
        'Edge',
        'Bronco',
        'Mustang',
        'Transit',
        'Ka',
        'Laser',
      ],
      pais: 'EE.UU.',
      popular: true,
    },
    Volkswagen: {
      modelos: [
        'Gol',
        'Polo',
        'Golf',
        'Jetta',
        'Passat',
        'Tiguan',
        'Amarok',
        'Touareg',
        'T-Cross',
        'Taos',
        'Teramont',
        'Virtus',
        'Vento',
        'Saveiro',
        'Beetle',
        'Transporter',
        'Caddy',
      ],
      pais: 'Alemania',
      popular: true,
    },
    Renault: {
      modelos: [
        'Sandero',
        'Logan',
        'Duster',
        'Kwid',
        'Stepway',
        'Clio',
        'Captur',
        'Koleos',
        'Oroch',
        'Megane',
        'Fluence',
        'Kangoo',
        'Master',
        'Twingo',
        'Symbol',
        'Scenic',
      ],
      pais: 'Francia',
      popular: true,
    },
    Honda: {
      modelos: [
        'Civic',
        'Accord',
        'CR-V',
        'HR-V',
        'Fit',
        'City',
        'Pilot',
        'Odyssey',
        'Ridgeline',
        'Passport',
        'Element',
        'Prelude',
        'Insight',
        'Jazz',
        'S2000',
        'CR-Z',
      ],
      pais: 'Japón',
      popular: true,
    },
    Suzuki: {
      modelos: [
        'Alto',
        'Swift',
        'Vitara',
        'Grand Vitara',
        'S-Cross',
        'Celerio',
        'Baleno',
        'Jimny',
        'Ignis',
        'Ertiga',
        'XL7',
        'Forenza',
        'Aerio',
        'Sidekick',
        'Samurai',
        'Carry',
      ],
      pais: 'Japón',
      popular: true,
    },
    Mitsubishi: {
      modelos: [
        'Lancer',
        'Outlander',
        'ASX',
        'Montero',
        'L200',
        'Eclipse',
        'Mirage',
        'Pajero',
        'Galant',
        'Space Star',
        'Endeavor',
        'Nativa',
        'Eclipse Cross',
        'Raider',
      ],
      pais: 'Japón',
      popular: false,
    },
    Peugeot: {
      modelos: [
        '208',
        '301',
        '308',
        '408',
        '508',
        '2008',
        '3008',
        '5008',
        'Partner',
        'Boxer',
        '207',
        '307',
        '407',
        '206',
        '306',
      ],
      pais: 'Francia',
      popular: false,
    },
    Citroën: {
      modelos: [
        'C3',
        'C4',
        'C5',
        'C-Elysée',
        'C3 Aircross',
        'C5 Aircross',
        'Berlingo',
        'Jumper',
        'Saxo',
        'Xsara',
        'Picasso',
        'DS3',
      ],
      pais: 'Francia',
      popular: false,
    },
    Fiat: {
      modelos: [
        'Uno',
        'Palio',
        'Siena',
        'Strada',
        '500',
        'Mobi',
        'Argo',
        'Cronos',
        'Toro',
        'Ducato',
        'Doblo',
        'Punto',
        'Linea',
        'Bravo',
      ],
      pais: 'Italia',
      popular: false,
    },
    Jeep: {
      modelos: [
        'Cherokee',
        'Grand Cherokee',
        'Wrangler',
        'Compass',
        'Renegade',
        'Patriot',
        'Commander',
        'Gladiator',
        'Liberty',
        'CJ-5',
        'CJ-7',
      ],
      pais: 'EE.UU.',
      popular: false,
    },
    Subaru: {
      modelos: [
        'Impreza',
        'Legacy',
        'Forester',
        'Outback',
        'XV',
        'WRX',
        'BRZ',
        'Tribeca',
        'Baja',
        'Justy',
      ],
      pais: 'Japón',
      popular: false,
    },
    Isuzu: {
      modelos: [
        'D-Max',
        'Trooper',
        'Rodeo',
        'Amigo',
        'Axiom',
        'Ascender',
        'NPR',
        'NQR',
        'FTR',
        'ELF',
      ],
      pais: 'Japón',
      popular: false,
    },
    'Great Wall': {
      modelos: ['Wingle', 'Haval', 'Hover', 'M4', 'Voleex', 'Sailor', 'Florid', 'Poer', 'H6', 'H9'],
      pais: 'China',
      popular: false,
    },
    JAC: {
      modelos: ['S2', 'S3', 'S5', 'T6', 'T8', 'Refine', 'Sunray', 'J3', 'J4', 'J5', 'J6'],
      pais: 'China',
      popular: false,
    },
    Chery: {
      modelos: [
        'QQ',
        'Tiggo',
        'Arrizo',
        'Grand Tiggo',
        'Fulwin',
        'Orinoco',
        'X1',
        'Tiggo 2',
        'Tiggo 5',
        'Tiggo 7',
        'Tiggo 8',
      ],
      pais: 'China',
      popular: false,
    },
    BYD: {
      modelos: [
        'F3',
        'F0',
        'S6',
        'Tang',
        'Song',
        'Yuan',
        'Han',
        'Qin',
        'Dolphin',
        'Seal',
        'Atto 3',
      ],
      pais: 'China',
      popular: false,
    },
    MG: {
      modelos: ['ZS', 'RX5', '5', '6', '3', 'HS', 'GT', 'Marvel R', 'ZS EV', 'MG3 Cross'],
      pais: 'China/Reino Unido',
      popular: false,
    },
    BMW: {
      modelos: [
        'Serie 1',
        'Serie 2',
        'Serie 3',
        'Serie 4',
        'Serie 5',
        'Serie 6',
        'Serie 7',
        'X1',
        'X2',
        'X3',
        'X4',
        'X5',
        'X6',
        'X7',
        'Z4',
        'i3',
        'i4',
        'iX',
      ],
      pais: 'Alemania',
      popular: false,
    },
    'Mercedes-Benz': {
      modelos: [
        'Clase A',
        'Clase B',
        'Clase C',
        'Clase E',
        'Clase S',
        'GLA',
        'GLB',
        'GLC',
        'GLE',
        'GLS',
        'Sprinter',
        'Vito',
        'CLA',
        'CLS',
        'SL',
        'SLC',
        'AMG GT',
        'EQC',
      ],
      pais: 'Alemania',
      popular: false,
    },
    Audi: {
      modelos: [
        'A1',
        'A3',
        'A4',
        'A5',
        'A6',
        'A7',
        'A8',
        'Q2',
        'Q3',
        'Q5',
        'Q7',
        'Q8',
        'TT',
        'R8',
        'e-tron',
      ],
      pais: 'Alemania',
      popular: false,
    },
    'Land Rover': {
      modelos: [
        'Defender',
        'Discovery',
        'Discovery Sport',
        'Range Rover',
        'Range Rover Sport',
        'Range Rover Evoque',
        'Range Rover Velar',
        'Freelander',
        'LR2',
        'LR3',
        'LR4',
      ],
      pais: 'Reino Unido',
      popular: false,
    },
    Dodge: {
      modelos: [
        'Ram',
        'Journey',
        'Durango',
        'Charger',
        'Challenger',
        'Caravan',
        'Grand Caravan',
        'Dart',
        'Avenger',
        'Nitro',
        'Dakota',
      ],
      pais: 'EE.UU.',
      popular: false,
    },
    GMC: {
      modelos: [
        'Sierra',
        'Yukon',
        'Acadia',
        'Terrain',
        'Canyon',
        'Savana',
        'Jimmy',
        'Envoy',
        'Safari',
      ],
      pais: 'EE.UU.',
      popular: false,
    },
    Cadillac: {
      modelos: ['Escalade', 'XT5', 'XT4', 'CT4', 'CT5', 'CT6', 'SRX', 'CTS', 'ATS', 'DTS', 'STS'],
      pais: 'EE.UU.',
      popular: false,
    },
    Volvo: {
      modelos: [
        'S40',
        'S60',
        'S80',
        'S90',
        'V40',
        'V60',
        'V90',
        'XC40',
        'XC60',
        'XC90',
        'C30',
        'C70',
      ],
      pais: 'Suecia',
      popular: false,
    },
    Porsche: {
      modelos: [
        '911',
        'Cayenne',
        'Macan',
        'Panamera',
        'Boxster',
        'Cayman',
        'Taycan',
        '718',
        'Carrera',
      ],
      pais: 'Alemania',
      popular: false,
    },
    Tesla: {
      modelos: ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck', 'Roadster'],
      pais: 'EE.UU.',
      popular: false,
    },
    Haval: {
      modelos: ['H6', 'H9', 'Jolion', 'F7', 'F7x', 'M6', 'Dargo'],
      pais: 'China',
      popular: false,
    },
    Geely: {
      modelos: ['Emgrand', 'GC6', 'LC', 'CK', 'MK', 'Coolray', 'Azkarra'],
      pais: 'China',
      popular: false,
    },
    Dongfeng: {
      modelos: ['Rich', 'S30', 'C37', 'AX7', 'Glory 580'],
      pais: 'China',
      popular: false,
    },
    Foton: {
      modelos: ['Tunland', 'View', 'Gratour', 'Sauvana', 'Aumark'],
      pais: 'China',
      popular: false,
    },
    SsangYong: {
      modelos: ['Rexton', 'Korando', 'Tivoli', 'Actyon', 'Kyron', 'Musso'],
      pais: 'Corea del Sur',
      popular: false,
    },
    Mahindra: {
      modelos: ['Scorpio', 'XUV500', 'Thar', 'Bolero', 'Pik-Up'],
      pais: 'India',
      popular: false,
    },
  },

  /**
   * Obtiene todas las marcas ordenadas alfabéticamente
   * Las marcas populares aparecen primero
   */
  obtenerMarcas() {
    const marcas = Object.entries(this.catalogo).map(([marca, datos]) => ({
      nombre: marca,
      popular: datos.popular || false,
      pais: datos.pais,
    }));

    // Ordenar: populares primero, luego alfabéticamente
    return marcas.sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.nombre.localeCompare(b.nombre, 'es');
    });
  },

  /**
   * Obtiene los modelos de una marca específica
   */
  obtenerModelos(marca) {
    if (!marca || !this.catalogo[marca]) return [];
    return this.catalogo[marca].modelos.sort((a, b) => a.localeCompare(b, 'es'));
  },

  /**
   * Busca marcas que coincidan con el texto ingresado
   */
  buscarMarcas(texto) {
    if (!texto) return this.obtenerMarcas();

    const textoNormalizado = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return this.obtenerMarcas().filter((marca) => {
      const nombreNormalizado = marca.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return (
        nombreNormalizado.includes(textoNormalizado) ||
        nombreNormalizado.startsWith(textoNormalizado)
      );
    });
  },

  /**
   * Busca modelos que coincidan con el texto ingresado
   */
  buscarModelos(marca, texto) {
    if (!marca) return [];

    const modelos = this.obtenerModelos(marca);
    if (!texto) return modelos;

    const textoNormalizado = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return modelos.filter((modelo) => {
      const modeloNormalizado = modelo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return (
        modeloNormalizado.includes(textoNormalizado) ||
        modeloNormalizado.startsWith(textoNormalizado)
      );
    });
  },

  /**
   * Valida si una marca existe en el catálogo
   */
  validarMarca(marca) {
    return this.catalogo.hasOwnProperty(marca);
  },

  /**
   * Valida si un modelo existe para una marca específica
   */
  validarModelo(marca, modelo) {
    if (!this.validarMarca(marca)) return false;
    return this.catalogo[marca].modelos.includes(modelo);
  },

  /**
   * Obtiene información completa de una marca
   */
  obtenerInfoMarca(marca) {
    return this.catalogo[marca] || null;
  },

  /**
   * Agrega una marca personalizada (para casos no listados)
   */
  agregarMarcaPersonalizada(marca) {
    if (!marca || this.catalogo[marca]) return false;

    this.catalogo[marca] = {
      modelos: [],
      pais: 'Personalizado',
      popular: false,
      personalizada: true,
    };

    return true;
  },

  /**
   * Agrega un modelo personalizado a una marca
   */
  agregarModeloPersonalizado(marca, modelo) {
    if (!marca || !modelo) return false;

    if (!this.catalogo[marca]) {
      this.agregarMarcaPersonalizada(marca);
    }

    if (!this.catalogo[marca].modelos.includes(modelo)) {
      this.catalogo[marca].modelos.push(modelo);
      this.catalogo[marca].modelos.sort((a, b) => a.localeCompare(b, 'es'));
      return true;
    }

    return false;
  },
};

// Exponer globalmente
window.CatalogoVehiculosEcuador = CatalogoVehiculosEcuador;
