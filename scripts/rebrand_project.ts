import * as fs from 'fs';
import * as path from 'path';

const REPLACEMENTS = [
    { from: /Universal Hub/g, to: 'Universal Hub' },
    { from: /universal_live/g, to: 'universal_live' },
    { from: /universal_mass_test/g, to: 'universal_mass_test' },
    { from: /universal_full_report/g, to: 'universal_full_report' },
    { from: /universal_raw_report/g, to: 'universal_raw_report' },
    { from: /distributor-catalog.pl/g, to: 'distributor-catalog.pl' },
    { from: /Universal/g, to: 'Universal' },
    { from: /\bmkj\b/g, to: 'universal' }
];

const DIRS_TO_RENAME = [
    { from: 'public/uploads/catalogs/universal_live', to: 'public/uploads/catalogs/universal_live' },
    { from: 'public/uploads/catalogs/universal_mass_test', to: 'public/uploads/catalogs/universal_mass_test' }
];

const SCAN_DIRS = ['scripts', 'src', '.agent', '.claude'];
const SCAN_FILES = ['GEMINI.md', 'AGENTS.md', 'README.md', 'package.json'];

function rebrandFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const r of REPLACEMENTS) {
        if (r.from.test(content)) {
            content = content.replace(r.from, r.to);
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`  [OK] Rebranded: ${filePath}`);
    }
}

function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            walkDir(p);
        } else if (/\.(ts|js|json|md|txt)$/.test(file)) {
            rebrandFile(p);
        }
    }
}

async function main() {
    console.log('=== STARTING GLOBAL REBRAND V2 ===');

    // 1. Rename Directories
    for (const d of DIRS_TO_RENAME) {
        if (fs.existsSync(d.from)) {
            console.log(`Renaming directory: ${d.from} -> ${d.to}`);
            if (fs.existsSync(d.to)) {
                console.log(`  [SKIP] Target directory ${d.to} already exists.`);
            } else {
                fs.renameSync(d.from, d.to);
                console.log(`  [OK] Directory renamed.`);
            }
        }
    }

    // 2. Rebrand standalone files
    for (const f of SCAN_FILES) {
        rebrandFile(f);
    }

    // 3. Rebrand directories recursively
    for (const d of SCAN_DIRS) {
        console.log(`Scanning directory: ${d}...`);
        walkDir(d);
    }

    console.log('=== GLOBAL REBRAND V2 COMPLETE ===');
}

main().catch(console.error);
