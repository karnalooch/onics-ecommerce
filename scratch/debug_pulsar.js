
const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

async function debugPdf(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer, { max: 5 }); // Just first 5 pages
    console.log("--- PDF CONTENT START ---");
    console.log(data.text);
    console.log("--- PDF CONTENT END ---");
}

debugPdf('public/uploads/catalogs/Pulsar_Cennik_Detal_2023.pdf')
    .catch(err => console.error(err));
