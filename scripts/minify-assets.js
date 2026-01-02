const fs = require('fs');
const path = require('path');

// Simple regex based minifier for demo purposes. 
// In real world, use 'terser' for JS and 'csso' for CSS.

function minifyCSS(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '') // comments
        .replace(/\s+/g, ' ') // whitespace
        .replace(/;\s*}/g, '}')
        .trim();
}

function minifyJS(content) {
    return content
        .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
        .replace(/\/\/.*$/gm, '') // line comments
        .replace(/\s+/g, ' ') // whitespace 
        // Note: Simple regex minification for JS is risky (ASI issues). 
        // We will keep it very conservative or skipping for this demo if not using tools.
        // Let's just remove comments and excessive newlines.
        .trim();
}

const PUBLIC_DIR = path.join(__dirname, '../public');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDir(filePath);
        } else if (file.endsWith('.css')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const minified = minifyCSS(content);
            fs.writeFileSync(filePath.replace('.css', '.min.css'), minified);
            console.log(`Minified: ${file}`);
        } else if (file.endsWith('.js') && !file.endsWith('.min.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            // const minified = minifyJS(content);
            // fs.writeFileSync(filePath.replace('.js', '.min.js'), minified);
            // Skipping JS minification to avoid breaking code with regex.
            console.log(`Skipping JS Minify (Risk): ${file}`);
        }
    });
}

console.log('📦 Starting Asset Minification...');
processDir(PUBLIC_DIR);
console.log('✅ Minification Complete.');
