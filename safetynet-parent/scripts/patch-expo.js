/**
 * Patch script to fix Expo CLI Windows colon directory name issue
 * This script replaces 'node:sea' with 'node-sea' in the Expo CLI externals file
 */

const fs = require('fs');
const path = require('path');

const externalsFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@expo',
  'cli',
  'src',
  'start',
  'server',
  'metro',
  'externals.ts'
);

function patchExpoCli() {
  try {
    if (!fs.existsSync(externalsFile)) {
      console.log('⚠️  Expo CLI externals.ts not found. Skipping patch.');
      console.log('   This is normal if node_modules is not installed yet.');
      return;
    }

    let content = fs.readFileSync(externalsFile, 'utf8');
    
    // Check if already patched
    if (content.includes('node-sea') && !content.includes("'node:sea'")) {
      console.log('✅ Expo CLI already patched.');
      return;
    }

    // Replace 'node:sea' with 'node-sea' in directory creation
    const originalPattern = /'node:sea'/g;
    const replacement = "'node-sea'";
    
    if (content.match(originalPattern)) {
      content = content.replace(originalPattern, replacement);
      fs.writeFileSync(externalsFile, content, 'utf8');
      console.log('✅ Patched Expo CLI: Replaced "node:sea" with "node-sea"');
    } else {
      console.log('⚠️  Pattern not found. Expo CLI might have been updated.');
    }
  } catch (error) {
    console.error('❌ Error patching Expo CLI:', error.message);
    console.log('   You may need to run: npm install');
  }
}

patchExpoCli();


