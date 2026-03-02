/**
 * Find and patch Expo CLI externals.ts file
 */

const fs = require('fs');
const path = require('path');

function findAndPatch(dir, depth = 0) {
  if (depth > 10) return false; // Prevent infinite recursion
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        if (findAndPatch(fullPath, depth + 1)) {
          return true;
        }
      } else if (entry.isFile() && entry.name === 'externals.ts') {
        console.log(`Found: ${fullPath}`);
        let content = fs.readFileSync(fullPath, 'utf8');
        
        if (content.includes("'node:sea'")) {
          console.log('Patching...');
          content = content.replace(/'node:sea'/g, "'node-sea'");
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('✅ Patched successfully!');
          return true;
        } else if (content.includes('node:sea')) {
          console.log('Patching (without quotes)...');
          content = content.replace(/node:sea/g, 'node-sea');
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log('✅ Patched successfully!');
          return true;
        }
      }
    }
  } catch (err) {
    // Ignore errors
  }
  
  return false;
}

const nodeModulesPath = path.join(__dirname, '..', 'node_modules', '@expo', 'cli');
console.log(`Searching in: ${nodeModulesPath}`);

if (fs.existsSync(nodeModulesPath)) {
  if (findAndPatch(nodeModulesPath)) {
    console.log('\n✅ Patch complete! Try running: npm start');
  } else {
    console.log('\n⚠️  File not found or already patched.');
    console.log('Trying alternative locations...');
    
    // Try common locations
    const alternatives = [
      path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'src', 'start', 'server', 'metro', 'externals.ts'),
      path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'dist', 'start', 'server', 'metro', 'externals.js'),
    ];
    
    for (const altPath of alternatives) {
      if (fs.existsSync(altPath)) {
        console.log(`Found alternative: ${altPath}`);
        let content = fs.readFileSync(altPath, 'utf8');
        if (content.includes('node:sea')) {
          content = content.replace(/node:sea/g, 'node-sea');
          fs.writeFileSync(altPath, content, 'utf8');
          console.log('✅ Patched alternative file!');
          process.exit(0);
        }
      }
    }
  }
} else {
  console.log('❌ @expo/cli not found in node_modules');
  console.log('Run: npm install');
}


