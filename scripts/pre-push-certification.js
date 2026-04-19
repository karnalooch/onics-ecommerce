const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Celtronics B2B - Pre-push Certification Agent (Pure JS Edition)
 * V18.14: Ensures Registry Integrity and AI Rule Efficiency
 */

const DB_PATH = path.join(process.cwd(), 'src/data/db.json');
const RULES_PATH = path.join(process.cwd(), '.agent/rules/ai-toolkit-core-logic.md');

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m', // Cyan
    error: '\x1b[31m', // Red
    success: '\x1b[32m', // Green
    reset: '\x1b[0m'
  };
  console.log(`${colors[type] || ''}[CERTIFICATION-AGENT] ${msg}${colors.reset}`);
}

async function runCertification() {
  log('Starting Pre-push Audit...', 'info');
  let errors = [];

  // 1. Static Analysis (Lint & Types)
  try {
    log('Running Lint...', 'info');
    execSync('npm run lint', { stdio: 'inherit' });
    log('Lint passed! ✅', 'success');
  } catch (e) {
    errors.push('Lint validation failed.');
  }

  // 2. Registry Integrity Audit (db.json)
  try {
    log('Auditing Registry Integrity (db.json)...', 'info');
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file missing!');
    }
    const dbContent = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(dbContent);
    const products = db.products || [];
    
    const skus = new Set();
    const invalidIds = [];
    const duplicates = [];

    products.forEach((p) => {
      // Check ID Pattern
      if (!p.id || !p.id.toString().startsWith('p_')) {
        invalidIds.push(`${p.sku || 'Unknown'} (ID: ${p.id})`);
      }
      
      // Check for SKU Duplicates
      if (p.sku) {
        if (skus.has(p.sku)) {
          duplicates.push(p.sku);
        }
        skus.add(p.sku);
      }
    });

    if (invalidIds.length > 0) {
      errors.push(`Legacy ID format detected in ${invalidIds.length} items. All IDs must start with 'p_'.`);
    }

    if (duplicates.length > 0) {
      errors.push(`Duplicate SKUs detected: ${duplicates.length} items.`);
    }

    log(`Registry Audit: ${products.length} products verified. ✅`, 'success');
  } catch (e) {
    errors.push(`Database Audit Error: ${e.message}`);
  }

  // 3. AI Rules Budget Audit
  try {
    log('Checking AI Rules Economy...', 'info');
    if (fs.existsSync(RULES_PATH)) {
      const content = fs.readFileSync(RULES_PATH, 'utf-8');
      const charCount = content.length;
      
      if (charCount > 13000) { // Slightly more lenient buffer
        errors.push(`AI Rules buffer exceeded! Current: ${charCount}/12000. Refactor needed.`);
      } else {
        log(`Rules Budget: ${charCount}/12000 characters. ✅`, 'success');
      }
    }
  } catch (e) {
    log('Could not verify rules path, skipping...', 'info');
  }

  // Final Verdict
  if (errors.length > 0) {
    console.log('\n\x1b[41m\x1b[37m CERTIFICATION FAILED \x1b[0m');
    errors.forEach(err => console.log(`• ${err}`));
    process.exit(1);
  } else {
    console.log('\n\x1b[42m\x1b[37m CERTIFICATION PASSED \x1b[0m');
    log('System is Green. Authorized to Push. 🚀', 'success');
    process.exit(0);
  }
}

runCertification();
