/**
 * Test Utilities
 * Ortak test fonksiyonları ve helpers
 */

const http = require('http');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * HTTP request helper
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - API path
 * @param {object} data - Request body (optional)
 * @param {object} headers - Custom headers (optional)
 * @returns {Promise<{status: number, data: any, headers: object}>}
 */
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = body ? JSON.parse(body) : {};
                    resolve({ 
                        status: res.statusCode, 
                        data: response, 
                        headers: res.headers 
                    });
                } catch (e) {
                    resolve({ 
                        status: res.statusCode, 
                        data: body, 
                        headers: res.headers 
                    });
                }
            });
        });

        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * Test runner helper
 * @param {string} name - Test name
 * @param {Function} testFn - Test function
 * @returns {Promise<boolean>} - Test result
 */
async function runTest(name, testFn) {
    try {
        await testFn();
        console.log(`✅ ${name}`);
        return true;
    } catch (error) {
        console.error(`❌ ${name}`);
        console.error(`   Hata: ${error.message}`);
        return false;
    }
}

/**
 * Wait for server to be ready
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise<void>}
 */
function waitForServer(retries = 10, delay = 1000) {
    return new Promise((resolve, reject) => {
        const attempt = () => {
            http.get(BASE_URL + '/api/v1/health', (res) => {
                if (res.statusCode === 200) {
                    resolve();
                } else if (retries > 0) {
                    setTimeout(() => {
                        retries--;
                        attempt();
                    }, delay);
                } else {
                    reject(new Error('Sunucu başlatılamadı'));
                }
            }).on('error', () => {
                if (retries > 0) {
                    setTimeout(() => {
                        retries--;
                        attempt();
                    }, delay);
                } else {
                    reject(new Error('Sunucu başlatılamadı'));
                }
            });
        };
        attempt();
    });
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert helper
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message
 * @throws {Error} - If condition is false
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * Assert equal helper
 * @param {any} actual - Actual value
 * @param {any} expected - Expected value
 * @param {string} message - Error message
 * @throws {Error} - If values are not equal
 */
function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Beklenen: ${expected}, Alınan: ${actual}`);
    }
}

/**
 * Assert array helper
 * @param {any} value - Value to check
 * @param {string} message - Error message
 * @throws {Error} - If value is not an array
 */
function assertArray(value, message) {
    if (!Array.isArray(value)) {
        throw new Error(message || 'Array bekleniyor');
    }
}

/**
 * Assert object helper
 * @param {any} value - Value to check
 * @param {string} message - Error message
 * @throws {Error} - If value is not an object
 */
function assertObject(value, message) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(message || 'Object bekleniyor');
    }
}

/**
 * Test suite runner
 * @param {string} suiteName - Suite name
 * @param {Array<[string, Function]>} tests - Array of [name, testFn] tuples
 * @returns {Promise<{passed: number, failed: number, total: number}>}
 */
async function runTestSuite(suiteName, tests) {
    console.log(`\n╔${'═'.repeat(suiteName.length + 6)}╗`);
    console.log(`║   ${suiteName}   ║`);
    console.log(`╚${'═'.repeat(suiteName.length + 6)}╝\n`);

    let passed = 0;
    let failed = 0;

    for (const [name, testFn] of tests) {
        const result = await runTest(name, testFn);
        if (result) passed++;
        else failed++;
        
        // Small delay to avoid rate limiting
        await sleep(100);
    }

    const total = tests.length;

    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║  ✅ Başarılı: ${passed.toString().padEnd(28)} ║`);
    console.log(`║  ❌ Başarısız: ${failed.toString().padEnd(27)} ║`);
    console.log(`║  📊 Toplam: ${total.toString().padEnd(30)} ║`);
    console.log('╚════════════════════════════════════════════╝\n');

    return { passed, failed, total };
}

module.exports = {
    makeRequest,
    runTest,
    waitForServer,
    sleep,
    assert,
    assertEqual,
    assertArray,
    assertObject,
    runTestSuite,
    BASE_URL
};
