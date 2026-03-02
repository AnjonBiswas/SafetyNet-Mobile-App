/**
 * Kill process on port 8081 (Metro bundler port)
 */

const { exec } = require('child_process');
const platform = process.platform;

let command;

if (platform === 'win32') {
  // Windows
  command = 'netstat -ano | findstr :8081';
  exec(command, (error, stdout) => {
    if (error) {
      console.log('No process found on port 8081');
      return;
    }
    
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });
    
    if (pids.size === 0) {
      console.log('No process found on port 8081');
      return;
    }
    
    console.log(`Found ${pids.size} process(es) on port 8081. Killing...`);
    pids.forEach(pid => {
      exec(`taskkill /PID ${pid} /F`, (err) => {
        if (err) {
          console.error(`Failed to kill process ${pid}:`, err.message);
        } else {
          console.log(`✅ Killed process ${pid}`);
        }
      });
    });
  });
} else {
  // Unix/Linux/Mac
  command = 'lsof -ti:8081';
  exec(command, (error, stdout) => {
    if (error) {
      console.log('No process found on port 8081');
      return;
    }
    
    const pids = stdout.trim().split('\n').filter(Boolean);
    if (pids.length === 0) {
      console.log('No process found on port 8081');
      return;
    }
    
    console.log(`Found ${pids.length} process(es) on port 8081. Killing...`);
    pids.forEach(pid => {
      exec(`kill -9 ${pid}`, (err) => {
        if (err) {
          console.error(`Failed to kill process ${pid}:`, err.message);
        } else {
          console.log(`✅ Killed process ${pid}`);
        }
      });
    });
  });
}

