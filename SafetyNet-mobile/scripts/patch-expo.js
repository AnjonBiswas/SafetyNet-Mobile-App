// Postinstall script to patch Expo CLI for Windows compatibility
const fs = require('fs');
const path = require('path');

const externalsPath = path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');

if (!fs.existsSync(externalsPath)) {
    console.log('Expo externals.js not found, skipping patch');
    process.exit(0);
}

let content = fs.readFileSync(externalsPath, 'utf8');

// Check if already patched
if (content.includes('EXPO_NO_SHIM === \'1\'')) {
    console.log('Expo externals.js already patched');
    process.exit(0);
}

// Patch the tapNodeShims function
const oldFunction = `// Ensure Node.js shims which require using \`$$require_external\` are available inside the project.
async function tapNodeShims(projectRoot) {
    const externals = {};
    for (const moduleId of NODE_STDLIB_MODULES){
        const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);
        const shimPath = _path.default.join(shimDir, "index.js");
        externals[moduleId] = shimPath;
        if (!_fs.default.existsSync(shimPath)) {
            await _fs.default.promises.mkdir(shimDir, {
                recursive: true
            });
            await _fs.default.promises.writeFile(shimPath, tapNodeShimContents(moduleId));
        }
    }
}`;

const newFunction = `// Ensure Node.js shims which require using \`$$require_external\` are available inside the project.
async function tapNodeShims(projectRoot) {
    // Skip shim creation if EXPO_NO_SHIM is set (fixes Windows issue with node:sea)
    if (process.env.EXPO_NO_SHIM === '1' || process.env.EXPO_NO_SHIM === 'true') {
        return;
    }
    const externals = {};
    for (const moduleId of NODE_STDLIB_MODULES){
        // Skip modules with colons (invalid on Windows filesystems)
        if (moduleId.includes(':')) {
            continue;
        }
        const shimDir = _path.default.join(projectRoot, METRO_EXTERNALS_FOLDER, moduleId);
        const shimPath = _path.default.join(shimDir, "index.js");
        externals[moduleId] = shimPath;
        if (!_fs.default.existsSync(shimPath)) {
            await _fs.default.promises.mkdir(shimDir, {
                recursive: true
            });
            await _fs.default.promises.writeFile(shimPath, tapNodeShimContents(moduleId));
        }
    }
}`;

if (content.includes(oldFunction)) {
    content = content.replace(oldFunction, newFunction);
    fs.writeFileSync(externalsPath, content, 'utf8');
    console.log('✅ Patched Expo externals.js for Windows compatibility');
} else {
    console.log('⚠️  Could not find exact function to patch, manual patch may be needed');
}
