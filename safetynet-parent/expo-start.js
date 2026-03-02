#!/usr/bin/env node

/**
 * Wrapper script for 'npx expo start' that applies the Windows patch
 * This ensures the patch works even when running 'npx expo start' directly
 */

// Apply the patch BEFORE anything else
const patchPath = require('path').join(__dirname, 'scripts', 'patch-fs-global.js');
require(patchPath);

// Now spawn expo with the patch already loaded
const { spawn } = require('child_process');
const args = process.argv.slice(2);

// Build expo command
const expoArgs = ['expo', ...args];

// Spawn with NODE_OPTIONS to ensure patch is loaded in child processes too
const child = spawn('npx', expoArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
  env: {
    ...process.env,
    NODE_OPTIONS: `--require ${patchPath} ${process.env.NODE_OPTIONS || ''}`.trim(),
    // Auto-accept port changes to avoid interactive prompts
    EXPO_NO_DOTENV: '1'
  }
});

child.on('error', (error) => {
  console.error('Error starting Expo:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

