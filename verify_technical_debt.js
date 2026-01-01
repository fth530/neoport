const { spawn, exec } = require('child_process');
const path = require('path');

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`${GREEN}🚀 Starting Verification Process...${RESET}`);

// Start Server
const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'pipe',
    shell: true
});

let serverStarted = false;

server.stdout.on('data', (data) => {
    const output = data.toString();
    // console.log(output); // Uncomment to see server output
    if (output.includes('Veritabanı başarıyla başlatıldı') && !serverStarted) {
        serverStarted = true;
        console.log(`${GREEN}✅ Server started successfully.${RESET}`);
        runTests();
    }
});

server.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
});

function runTests() {
    console.log(`${GREEN}🧪 Running API Tests...${RESET}`);

    // Run test-api.js
    exec('node test-api.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`${RED}❌ API Tests Failed:${RESET}\n${stderr || stdout}`);
            cleanup();
            process.exit(1);
        } else {
            console.log(`${GREEN}✅ API Tests Passed:${RESET}\n${stdout}`);

            // Run Frontend Tests
            console.log(`${GREEN}🧪 Running Frontend Tests...${RESET}`);
            exec('npx jest test-frontend.test.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`${RED}❌ Frontend Tests Failed:${RESET}\n${stderr || stdout}`);
                    cleanup();
                    process.exit(1);
                } else {
                    console.log(`${GREEN}✅ Frontend Tests Passed:${RESET}\n${stderr}`); // Jest outputs to stderr usually
                    console.log(`${GREEN}🎉 ALL SYSTEMS GO! Technical Debt Cleared.${RESET}`);
                    cleanup();
                    process.exit(0);
                }
            });
        }
    });
}

function cleanup() {
    console.log('Stopping server...');
    // Kill the server process tree
    if (process.platform === 'win32') {
        exec(`taskkill /pid ${server.pid} /T /F`);
    } else {
        server.kill();
    }
}

// Timeout
setTimeout(() => {
    if (!serverStarted) {
        console.error(`${RED}❌ Server start timeout.${RESET}`);
        cleanup();
        process.exit(1);
    }
}, 10000);
