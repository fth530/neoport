const fs = require('fs');
const path = require('path');

console.log('📱 Starting UX Tests...');

let passed = true;

// 1. File Existence
const files = [
    'public/js/pwa-install.js',
    'public/js/touch-gestures.js',
    'public/js/loading-states.js'
];

files.forEach(f => {
    const p = path.join(__dirname, f);
    if (fs.existsSync(p)) {
        console.log(`✅ File exists: ${f}`);
    } else {
        console.error(`❌ Missing file: ${f}`);
        passed = false;
    }
});

// 2. Index.html Meta Tag
try {
    const indexContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    if (indexContent.includes('viewport-fit=cover')) {
        console.log('✅ viewport-fit=cover present');
    } else {
        console.error('❌ viewport-fit=cover missing in index.html');
        passed = false;
    }
} catch (e) {
    console.error(`❌ Could not read index.html: ${e.message}`);
    passed = false;
}

// 3. Mock Loading States
// Simple mock of DOM
global.document = {
    getElementById: (id) => ({
        id,
        innerHTML: '',
        classList: {
            remove: () => { }
        },
        querySelector: () => null
    })
};
global.window = {};

try {
    require('./public/js/loading-states.js');
    if (typeof global.window.showSkeleton === 'function') {
        global.window.showSkeleton('test-container');
        console.log('✅ showSkeleton execution test passed');
    } else {
        console.error('❌ showSkeleton not exposed');
        passed = false;
    }
} catch (e) {
    console.error(`❌ showSkeleton test failed: ${e.message}`);
    passed = false;
}

if (passed) {
    console.log('\n✨ All UX Tests Passed!');
    process.exit(0);
} else {
    console.error('\n❌ Some UX Tests Failed!');
    process.exit(1);
}
