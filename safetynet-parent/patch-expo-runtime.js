/**
 * Runtime patch for Expo CLI Windows colon issue
 * This patches fs.promises.mkdir to replace 'node:sea' with 'node-sea'
 */

const fs = require('fs');
const path = require('path');

// Patch fs.promises.mkdir before Expo CLI loads
const originalMkdir = fs.promises.mkdir;
fs.promises.mkdir = function(dirPath, options) {
  // Convert path to string and replace colon
  let pathStr = String(dirPath);
  if (pathStr.includes('node:sea')) {
    pathStr = pathStr.replace(/node:sea/g, 'node-sea');
    console.log(`[Patch] Replaced node:sea with node-sea in path`);
  }
  return originalMkdir.call(this, pathStr, options);
};

// Also patch fs.mkdirSync for synchronous operations
const originalMkdirSync = fs.mkdirSync;
fs.mkdirSync = function(dirPath, options) {
  let pathStr = String(dirPath);
  if (pathStr.includes('node:sea')) {
    pathStr = pathStr.replace(/node:sea/g, 'node-sea');
  }
  return originalMkdirSync.call(this, pathStr, options);
};

console.log('✅ Expo CLI Windows patch applied');


