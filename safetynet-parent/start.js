#!/usr/bin/env node

/**
 * Custom start script for SafetyNet-Parent
 * This script handles the Windows colon directory name issue
 */

// Apply Windows colon directory name patch BEFORE anything else loads
const fs = require('fs');
const originalMkdir = fs.promises.mkdir;
const originalMkdirSync = fs.mkdirSync;
const originalWriteFile = fs.promises.writeFile;
const originalOpen = fs.promises.open;

// Patch mkdir
fs.promises.mkdir = function(dirPath, options) {
  let pathStr = String(dirPath);
  if (pathStr.includes('node:sea')) {
    pathStr = pathStr.replace(/node:sea/g, 'node-sea');
  }
  return originalMkdir.call(this, pathStr, options);
};

// Patch mkdirSync
fs.mkdirSync = function(dirPath, options) {
  let pathStr = String(dirPath);
  if (pathStr.includes('node:sea')) {
    pathStr = pathStr.replace(/node:sea/g, 'node-sea');
  }
  return originalMkdirSync.call(this, pathStr, options);
};

// Patch writeFile (for the index.js file creation)
fs.promises.writeFile = function(filePath, data, options) {
  let pathStr = String(filePath);
  if (pathStr.includes('node:sea')) {
    pathStr = pathStr.replace(/node:sea/g, 'node-sea');
  }
  return originalWriteFile.call(this, pathStr, data, options);
};

// Patch open (for file opening)
fs.promises.open = function(filePath, flags, mode) {
  let pathStr = String(filePath);
  if (pathStr.includes('node:sea')) {
    pathStr = pathStr.replace(/node:sea/g, 'node-sea');
  }
  return originalOpen.call(this, pathStr, flags, mode);
};

const { spawn } = require('child_process');
const path = require('path');

// Ensure .expo directory exists
const expoDir = path.join(__dirname, '.expo');
if (!fs.existsSync(expoDir)) {
  fs.mkdirSync(expoDir, { recursive: true });
}

// Ensure settings.json exists
const settingsPath = path.join(expoDir, 'settings.json');
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(settingsPath, JSON.stringify({
    hostType: 'lan',
    lanType: 'ip',
    dev: true,
    minify: false,
    urlRandomness: null
  }, null, 2));
}

// Get command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'start';

// Build expo command
const expoArgs = ['expo', command, ...args.slice(1)];

// Spawn the process with --require to patch fs before Expo loads
const patchScript = require('path').join(__dirname, 'scripts', 'patch-fs-global.js');
const child = spawn('npx', ['--node-options=--require', patchScript, ...expoArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_OPTIONS: `--require ${patchScript}`
  }
});

child.on('error', (error) => {
  console.error('Error starting Expo:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

