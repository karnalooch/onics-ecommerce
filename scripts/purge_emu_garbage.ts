import * as fs from 'fs';
import * as path from 'path';

const STORE_PATH = 'src/store/catalogKnowledge.json';

async function purge() {
    console.log('=== PURGING EMU GARBAGE V8 ===');
    if (!fs.existsSync(STORE_PATH)) return;

    const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    let count = 0;
    
    const symbols = Object.keys(store.knowledge);
    for (const symbol of symbols) {
        const info = store.knowledge[symbol];
        
        // Rules for garbage V8:
        // 1. Symbol has no letters (pure numeric garbage)
        // 2. Symbol contains 'SO/'
        // 3. Price is too high or scientific
        const hasLetters = /[A-Z]/i.test(symbol);
        const isGarbage = 
            !hasLetters ||
            symbol.includes('SO/') || 
            (info.price && info.price > 1000000) ||
            (String(info.price).toLowerCase().includes('e'));

        if (isGarbage) {
            delete store.knowledge[symbol];
            count++;
        }
    }

    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
    console.log(`DONE! Removed ${count} garbage entries (including numeric non-models).`);
}

purge().catch(console.error);
