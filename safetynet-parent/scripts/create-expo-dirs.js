/**
 * Create Expo directory structure with node-sea instead of node:sea
 * This works around Windows colon directory name limitation
 */

const fs = require('fs');
const path = require('path');

const expoDirs = [
  '.expo',
  '.expo/metro',
  '.expo/metro/externals',
  '.expo/metro/externals/node-sea', // Use node-sea instead of node:sea
];

expoDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  }
});

// Create placeholder index.js
const indexPath = path.join(__dirname, '..', '.expo', 'metro', 'externals', 'node-sea', 'index.js');
if (!fs.existsSync(indexPath)) {
  fs.writeFileSync(indexPath, '// Placeholder file\nmodule.exports = {};\n');
  console.log('✅ Created placeholder index.js');
}

console.log('✅ Expo directory structure created');


