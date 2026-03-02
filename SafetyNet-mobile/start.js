// Node.js script to start Expo with EXPO_NO_SHIM=1
process.env.EXPO_NO_SHIM = '1';
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const expoArgs = args.length > 0 ? args : ['start', '--clear'];

// Explicitly pass environment variables to child process
const child = spawn('npx', ['expo', ...expoArgs], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    EXPO_NO_SHIM: '1'
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
