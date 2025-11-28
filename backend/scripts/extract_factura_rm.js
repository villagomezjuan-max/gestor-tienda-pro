const fs = require('fs');
const path = require('path');

const { PDFParse } = require('pdf-parse');

async function main() {
  const pdfPath = path.resolve(__dirname, '..', '..', 'factura_rm.pdf');
  try {
    const parser = new PDFParse();
    const data = await parser.parse(fs.readFileSync(pdfPath));
    console.log(data.text);
  } catch (err) {
    console.error('Error al extraer texto:', err.message);
    process.exitCode = 1;
  }
}

main();
