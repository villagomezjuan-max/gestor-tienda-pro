/**
 * HERRAMIENTA DE LIMPIEZA AUTOMÁTICA DE CÓDIGO
 *
 * Ejecuta varias tareas de limpieza:
 * 1. Mover archivos .backup a carpeta backup/
 * 2. Generar reporte de console.log
 * 3. Buscar TODOs/FIXMEs
 * 4. Buscar código duplicado
 * 5. Verificar sintaxis
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================
// 1. MOVER ARCHIVOS BACKUP
// ============================================
function moverBackups() {
  log('\n📦 1. MOVIENDO ARCHIVOS BACKUP', 'cyan');
  log('='.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..', '..');
  const backupDir = path.join(rootDir, 'backup', 'js');

  // Crear carpeta backup si no existe
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    log(`✅ Carpeta backup creada: ${backupDir}`, 'green');
  }

  // Buscar archivos .backup
  const jsDir = path.join(rootDir, 'js');
  const backupFiles = fs.readdirSync(jsDir).filter((f) => f.endsWith('.backup'));

  if (backupFiles.length === 0) {
    log('✅ No hay archivos .backup que mover', 'green');
    return;
  }

  log(`Encontrados ${backupFiles.length} archivos backup:`, 'yellow');

  backupFiles.forEach((file) => {
    const source = path.join(jsDir, file);
    const dest = path.join(backupDir, file);

    try {
      fs.renameSync(source, dest);
      log(`  ✅ Movido: ${file}`, 'green');
    } catch (error) {
      log(`  ❌ Error moviendo ${file}: ${error.message}`, 'red');
    }
  });
}

// ============================================
// 2. GENERAR REPORTE DE CONSOLE.LOG
// ============================================
function generarReporteConsoleLogs() {
  log('\n📝 2. ANALIZANDO CONSOLE.LOG', 'cyan');
  log('='.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..', '..');
  const reportPath = path.join(rootDir, 'REPORTE_CONSOLE_LOGS.txt');

  try {
    // Buscar en backend
    const backendResults = execSync(
      'findstr /S /N /I "console\\.log\\|console\\.error\\|console\\.warn" backend\\*.js',
      { cwd: rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    )
      .split('\n')
      .filter((line) => line.trim());

    // Buscar en js
    const jsResults = execSync(
      'findstr /S /N /I "console\\.log\\|console\\.error\\|console\\.warn" js\\*.js',
      { cwd: rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    )
      .split('\n')
      .filter((line) => line.trim());

    const allResults = [...backendResults, ...jsResults];

    const report = [
      '# REPORTE DE CONSOLE.LOG',
      `Generado: ${new Date().toISOString()}`,
      `Total encontrados: ${allResults.length}`,
      '',
      '## RESULTADOS POR ARCHIVO',
      '',
    ];

    // Agrupar por archivo
    const byFile = {};
    allResults.forEach((line) => {
      const match = line.match(/^([^:]+):/);
      if (match) {
        const file = match[1];
        if (!byFile[file]) byFile[file] = [];
        byFile[file].push(line);
      }
    });

    Object.keys(byFile)
      .sort()
      .forEach((file) => {
        report.push(`### ${file} (${byFile[file].length} ocurrencias)`);
        byFile[file].slice(0, 10).forEach((line) => {
          report.push(`    ${line.substring(file.length + 1)}`);
        });
        if (byFile[file].length > 10) {
          report.push(`    ... y ${byFile[file].length - 10} más`);
        }
        report.push('');
      });

    fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');
    log(`✅ Reporte generado: ${reportPath}`, 'green');
    log(`   Total: ${allResults.length} console.log encontrados`, 'yellow');
  } catch (error) {
    log(`⚠️  No se encontraron console.log o error ejecutando: ${error.message}`, 'yellow');
  }
}

// ============================================
// 3. BUSCAR TODOs/FIXMEs
// ============================================
function buscarTodos() {
  log('\n🔍 3. BUSCANDO TODOs Y FIXMEs', 'cyan');
  log('='.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..', '..');
  const reportPath = path.join(rootDir, 'REPORTE_TODOS.txt');

  try {
    const results = execSync(
      'findstr /S /N /I "TODO:\\|FIXME:\\|XXX:\\|HACK:" backend\\*.js js\\*.js',
      { cwd: rootDir, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    )
      .split('\n')
      .filter((line) => line.trim());

    const report = [
      '# REPORTE DE TODOs Y FIXMEs',
      `Generado: ${new Date().toISOString()}`,
      `Total encontrados: ${results.length}`,
      '',
      '## LISTA COMPLETA',
      '',
      ...results,
    ];

    fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');
    log(`✅ Reporte generado: ${reportPath}`, 'green');
    log(`   Total: ${results.length} TODOs/FIXMEs encontrados`, 'yellow');

    // Mostrar primeros 5
    if (results.length > 0) {
      log('\n   Primeros 5:', 'yellow');
      results.slice(0, 5).forEach((line) => {
        log(`   ${line}`, 'yellow');
      });
    }
  } catch (error) {
    log(`✅ No se encontraron TODOs/FIXMEs`, 'green');
  }
}

// ============================================
// 4. VERIFICAR SINTAXIS
// ============================================
function verificarSintaxis() {
  log('\n✅ 4. VERIFICANDO SINTAXIS', 'cyan');
  log('='.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..', '..');
  const archivosProblematicos = [];

  // Verificar algunos archivos críticos
  const archivosAVerificar = [
    'backend/crear-datos-ejemplo.js',
    'backend/crear-ventas-demo.js',
    'backend/server.js',
  ];

  archivosAVerificar.forEach((file) => {
    const filePath = path.join(rootDir, file);

    if (!fs.existsSync(filePath)) {
      log(`  ⚠️  Archivo no existe: ${file}`, 'yellow');
      return;
    }

    try {
      // Intentar requerir el archivo
      require(filePath);
      log(`  ✅ ${file}`, 'green');
    } catch (error) {
      log(`  ⚠️  ${file} no pudo cargarse: ${error.message}`, 'yellow');
      archivosProblematicos.push({ file, reason: error.message });
    }
  });

  if (archivosProblematicos.length === 0) {
    log('\n✅ Todos los archivos verificados tienen sintaxis correcta', 'green');
  } else {
    log(`\n❌ ${archivosProblematicos.length} archivos con problemas`, 'red');
    archivosProblematicos.forEach(({ file, reason }) => {
      log(`   - ${file}: ${reason}`, 'yellow');
    });
  }
}

// ============================================
// 5. BUSCAR ARCHIVOS GRANDES
// ============================================
function buscarArchivosGrandes() {
  log('\n📊 5. BUSCANDO ARCHIVOS GRANDES (>100KB)', 'cyan');
  log('='.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..', '..');
  const archivosGrandes = [];

  function buscarEnDirectorio(dir, basePath = '') {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const relativePath = path.join(basePath, file);

      // Ignorar node_modules, .git, etc.
      if (file === 'node_modules' || file === '.git' || file === 'backup') {
        return;
      }

      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        buscarEnDirectorio(filePath, relativePath);
      } else if (stat.isFile() && file.endsWith('.js')) {
        const sizeKB = stat.size / 1024;
        if (sizeKB > 100) {
          archivosGrandes.push({ file: relativePath, size: sizeKB.toFixed(2) });
        }
      }
    });
  }

  buscarEnDirectorio(path.join(rootDir, 'backend'), 'backend');
  buscarEnDirectorio(path.join(rootDir, 'js'), 'js');

  archivosGrandes.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));

  if (archivosGrandes.length > 0) {
    log(`Encontrados ${archivosGrandes.length} archivos grandes:`, 'yellow');
    archivosGrandes.forEach(({ file, size }) => {
      log(`  ${size}KB - ${file}`, 'yellow');
    });
  } else {
    log('✅ No hay archivos excesivamente grandes', 'green');
  }
}

// ============================================
// MAIN
// ============================================
function main() {
  log('\n🧹 HERRAMIENTA DE LIMPIEZA DE CÓDIGO', 'bright');
  log('='.repeat(60), 'bright');

  try {
    moverBackups();
    generarReporteConsoleLogs();
    buscarTodos();
    verificarSintaxis();
    buscarArchivosGrandes();

    log('\n✅ LIMPIEZA COMPLETADA', 'green');
    log('='.repeat(60), 'green');
    log('\nRevisa los reportes generados:', 'cyan');
    log('  - REPORTE_CONSOLE_LOGS.txt', 'cyan');
    log('  - REPORTE_TODOS.txt', 'cyan');
  } catch (error) {
    log(`\n❌ Error durante la limpieza: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  moverBackups,
  generarReporteConsoleLogs,
  buscarTodos,
  verificarSintaxis,
  buscarArchivosGrandes,
};
