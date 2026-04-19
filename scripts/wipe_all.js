// scripts/wipe_all.js
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'src/data/db.json');
const KNOWLEDGE_PATH = path.join(process.cwd(), 'src/store/catalogKnowledge.json');

const emptyDb = {
  categories: [],
  manufacturers: [],
  products: [],
  orders: [],
  users: []
};

const emptyKnowledge = {
  lastUpdated: null,
  sources: [],
  processedSources: [],
  knowledge: {}
};

console.log("🚀 Starting Deep Wipe (JS Bypass Mode)...");

try {
  // Wipe Inventory Database
  fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb, null, 2));
  console.log("✅ src/data/db.json has been reset.");

  // Wipe IQ Hub Knowledge Base
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(emptyKnowledge, null, 2));
  console.log("✅ src/store/catalogKnowledge.json has been reset.");

  console.log("\n✨ Total Clear Success! Please refresh your browser (F5) to clear the frontend buffer.");
} catch (error) {
  console.error("❌ Wipe failed:", error);
}
