/**
 * Require hook to patch Expo CLI externals.ts before it loads
 * This intercepts the require() call and patches the source code
 */

const Module = require('module');
const fs = require('fs');
const path = require('path');

const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Intercept @expo/cli module loading
  if (id.includes('@expo/cli') && id.includes('externals')) {
    const filePath = require.resolve(id);
    
    // Read and patch the file
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('node:sea') && !content.includes('node-sea')) {
        console.log('[Patch] Patching externals.ts...');
        content = content.replace(/'node:sea'/g, "'node-sea'");
        content = content.replace(/"node:sea"/g, '"node-sea"');
        content = content.replace(/`node:sea`/g, '`node-sea`');
        content = content.replace(/node:sea/g, 'node-sea');
        
        // Write patched version to a temp location and require that
        const tempPath = filePath + '.patched';
        fs.writeFileSync(tempPath, content, 'utf8');
        return originalRequire.call(this, tempPath);
      }
    }
  }
  
  return originalRequire.apply(this, arguments);
};

