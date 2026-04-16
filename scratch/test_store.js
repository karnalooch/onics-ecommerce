
const { initializeMockData } = require('./src/store/serverStore');

function testStore() {
  console.log('--- TEST STORE ---');
  const { products } = initializeMockData();
  console.log(`Initial count: ${products.length}`);
  
  const testSku = 'TEST-SKU-' + Date.now();
  products.push({ id: 'test', sku: testSku, name: 'Test Product', price: 100 });
  
  const { products: products2 } = initializeMockData();
  console.log(`Count after push: ${products2.length}`);
  
  const found = products2.find(p => p.sku === testSku);
  if (found) {
    console.log('SUCCESS: Persistent in-memory change detected.');
  } else {
    console.log('FAILURE: Global store not persisting changes.');
  }
}

testStore();
