const { execSync } = require('child_process');

function killPort(port) {
    try {
        console.log(`Searching for process on port ${port}...`);
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');
        const pids = new Set();
        
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') pids.add(pid);
            }
        });
        
        pids.forEach(pid => {
            console.log(`Killing process ${pid}...`);
            try {
                execSync(`taskkill /F /PID ${pid}`);
            } catch (e) {}
        });
        
        console.log('Done.');
    } catch (err) {
        console.log(`Port ${port} seems clear.`);
    }
}

killPort(5000);
killPort(5001);
 killPort(5005);
