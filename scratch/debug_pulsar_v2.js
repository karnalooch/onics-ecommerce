
const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

async function debugPdf(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer, { pagerender: (pageData) => {
        // Custom page ranges if needed, but pdf-parse normally just gives text.
        // We'll stick to 'max' option for standard text extraction first.
        return pageData.getTextContent().then(function(textContent) {
            return textContent.items.map(i => i.str).join(' ');
        });
    }, max: 20 }); 
    console.log("--- PDF CONTENT START (Pages 1-20) ---");
    console.log(data.text);
    console.log("--- PDF CONTENT END ---");
}

debugPdf('public/uploads/catalogs/Pulsar_Cennik_Detal_2023.pdf')
    .catch(err => console.error(err));
