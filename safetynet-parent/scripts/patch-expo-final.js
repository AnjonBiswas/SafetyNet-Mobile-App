const fs = require('fs');
const path = require('path');

// Try multiple possible locations
const possiblePaths = [
  path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'src', 'start', 'server', 'metro', 'externals.ts'),
  path.join(__dirname, '..', 'node_modules', 'expo', 'node_modules', '@expo', 'cli', 'src', 'start', 'server', 'metro', 'externals.ts'),
];

let patched = false;

for (const filePath of possiblePaths) {
  console.log(`Checking: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found file!`);
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      // Replace all variations
      content = content.replace(/'node:sea'/g, "'node-sea'");
      content = content.replace(/"node:sea"/g, '"node-sea"');
      content = content.replace(/`node:sea`/g, '`node-sea`');
      content = content.replace(/node:sea/g, 'node-sea');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✅ Successfully patched!');
        patched = true;
        
        // Show what was changed
        const originalLines = originalContent.split('\n');
        const newLines = content.split('\n');
        console.log('\nChanges:');
        for (let i = 0; i < Math.min(originalLines.length, newLines.length); i++) {
          if (originalLines[i] !== newLines[i]) {
            console.log(`Line ${i + 1}:`);
            console.log(`  - ${originalLines[i].substring(0, 80)}`);
            console.log(`  + ${newLines[i].substring(0, 80)}`);
          }
        }
        break;
      } else {
        console.log('⚠️  File already patched or pattern not found');
      }
    } catch (error) {
      console.error(`Error patching file: ${error.message}`);
    }
  }
}

if (!patched) {
  console.log('\n❌ Could not find or patch the file.');
  console.log('The file might be in a different location or already patched.');
  console.log('\nTrying to search...');
  
  // Search recursively
  function searchAndPatch(dir, depth = 0) {
    if (depth > 6) return false;
    
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            if (searchAndPatch(fullPath, depth + 1)) return true;
          } else if (stat.isFile() && entry === 'externals.ts') {
            console.log(`Found: ${fullPath}`);
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('node:sea')) {
              content = content.replace(/'node:sea'/g, "'node-sea'");
              content = content.replace(/"node:sea"/g, '"node-sea"');
              content = content.replace(/`node:sea`/g, '`node-sea`');
              content = content.replace(/node:sea/g, 'node-sea');
              fs.writeFileSync(fullPath, content, 'utf8');
              console.log('✅ Patched!');
              return true;
            }
          }
        } catch (e) {
          // Skip
        }
      }
    } catch (e) {
      // Skip
    }
    return false;
  }
  
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    searchAndPatch(nodeModulesPath);
  }
}

