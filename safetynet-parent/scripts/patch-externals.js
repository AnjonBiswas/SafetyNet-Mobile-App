const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'src', 'start', 'server', 'metro', 'externals.ts');

console.log('Looking for file:', filePath);

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  console.log('Trying to find alternative locations...');
  
  // Try to find the file
  const cliPath = path.join(__dirname, '..', 'node_modules', '@expo', 'cli');
  if (fs.existsSync(cliPath)) {
    function findFile(dir, filename, depth = 0) {
      if (depth > 5) return null;
      try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            const found = findFile(fullPath, filename, depth + 1);
            if (found) return found;
          } else if (stat.isFile() && entry === filename) {
            return fullPath;
          }
        }
      } catch (e) {
        // Ignore
      }
      return null;
    }
    
    const found = findFile(cliPath, 'externals.ts');
    if (found) {
      console.log('Found file at:', found);
      patchFile(found);
    } else {
      console.error('Could not find externals.ts file');
      process.exit(1);
    }
  } else {
    console.error('@expo/cli not found');
    process.exit(1);
  }
} else {
  patchFile(filePath);
}

function patchFile(filePath) {
  console.log('Reading file:', filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const originalContent = content;
  
  // Replace all variations of node:sea
  content = content.replace(/'node:sea'/g, "'node-sea'");
  content = content.replace(/"node:sea"/g, '"node-sea"');
  content = content.replace(/`node:sea`/g, '`node-sea`');
  content = content.replace(/node:sea/g, 'node-sea');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully patched file!');
    console.log('Changes made:');
    const diff = content.split('\n').filter((line, i) => 
      originalContent.split('\n')[i] !== line
    );
    diff.forEach(line => console.log('  -', line.substring(0, 80)));
  } else {
    console.log('⚠️  File already patched or pattern not found');
  }
}

