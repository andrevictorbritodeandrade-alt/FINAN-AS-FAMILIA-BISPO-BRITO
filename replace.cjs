const fs = require('fs');
const path = require('path');

function processFile(fullPath) {
    if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let originalContent = content;

        content = content.replace(/new Intl\.NumberFormat\('pt-BR',\s*\{\s*style:\s*'currency',\s*currency:\s*'BRL'\s*\}\)\.format\((.*?)\)/g, 'formatCurrency($1)');
        content = content.replace(/new Intl\.NumberFormat\('pt-BR',\s*\{\s*style:\s*'currency',\s*currency:\s*'BRL',\s*notation:\s*'compact'\s*\}\)\.format\((.*?)\)/g, 'formatCurrency($1, true)');
        content = content.replace(/new Intl\.NumberFormat\('pt-BR',\s*\{\s*style:\s*'currency',\s*currency:\s*'BRL',\s*notation:\s*(.*?)\s*\}\)\.format\((.*?)\)/g, 'formatCurrency($2, $1 === "compact")');

        if (content !== originalContent) {
            let relativePath = './utils/financeUtils';
            if (fullPath.includes('components')) relativePath = '../utils/financeUtils';
                 
            if (!content.includes('formatCurrency')) {
                // Ignore, didn't actually replace anything
            } else if (!content.match(/formatCurrency.*from/)) {
                // Find the last import
                const lastImportIdx = content.lastIndexOf('import ');
                if (lastImportIdx !== -1) {
                    const endOfLastImport = content.indexOf('\n', lastImportIdx);
                    content = content.slice(0, endOfLastImport) + `\nimport { formatCurrency } from '${relativePath}';` + content.slice(endOfLastImport);
                } else {
                    content = `import { formatCurrency } from '${relativePath}';\n` + content;
                }
            }
        }
            
        if (content !== originalContent) {
            fs.writeFileSync(fullPath, content);
            console.log('Updated', fullPath);
        }
    }
}

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'replace.cjs') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

processDir('.');
