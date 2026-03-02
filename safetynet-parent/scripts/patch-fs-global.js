/**
 * Global fs.promises patch for Windows colon directory issue
 * This patches fs operations before Expo CLI loads
 */

const fs = require('fs');
const originalMkdir = fs.promises.mkdir;
const originalMkdirSync = fs.mkdirSync;
const originalWriteFile = fs.promises.writeFile;
const originalOpen = fs.promises.open;
const originalAccess = fs.promises.access;

function sanitizePath(path) {
  if (typeof path === 'string') {
    // Replace ALL node: prefixes with node- (Windows doesn't allow colons in directory names)
    // This handles node:sea, node:sqlite, node:fs, etc.
    return path.replace(/node:([a-zA-Z0-9_-]+)/g, 'node-$1');
  }
  return path;
}

// Patch mkdir
fs.promises.mkdir = function(dirPath, options) {
  return originalMkdir.call(this, sanitizePath(dirPath), options);
};

// Patch mkdirSync
fs.mkdirSync = function(dirPath, options) {
  return originalMkdirSync.call(this, sanitizePath(dirPath), options);
};

// Patch writeFile
fs.promises.writeFile = function(filePath, data, options) {
  return originalWriteFile.call(this, sanitizePath(filePath), data, options);
};

// Patch open
fs.promises.open = function(filePath, flags, mode) {
  return originalOpen.call(this, sanitizePath(filePath), flags, mode);
};

// Patch access
fs.promises.access = function(filePath, mode) {
  return originalAccess.call(this, sanitizePath(filePath), mode);
};

// Also patch fs (non-promises) versions
const originalMkdirSyncFs = fs.mkdirSync;
fs.mkdirSync = function(dirPath, options) {
  return originalMkdirSyncFs.call(this, sanitizePath(dirPath), options);
};

const originalWriteFileSync = fs.writeFileSync;
fs.writeFileSync = function(filePath, data, options) {
  return originalWriteFileSync.call(this, sanitizePath(filePath), data, options);
};

const originalOpenSync = fs.openSync;
fs.openSync = function(filePath, flags, mode) {
  return originalOpenSync.call(this, sanitizePath(filePath), flags, mode);
};

console.log('[Patch] fs.promises operations patched for Windows');

