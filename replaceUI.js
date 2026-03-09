const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walk(dirPath, callback);
        } else if (f.endsWith('.jsx')) {
            callback(path.join(dir, f));
        }
    });
}

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content
        .replace(/shadow-2xl/g, 'shadow-lg')
        .replace(/rounded-2xl/g, 'rounded-xl')
        .replace(/rounded-3xl/g, 'rounded-2xl')
        .replace(/drop-shadow-2xl/g, 'drop-shadow-lg');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated: ' + filePath);
    }
}

walk('C:\\Users\\nahim\\Documents\\Sistema Registro de Trabajo\\my-app\\components', replaceInFile);
walk('C:\\Users\\nahim\\Documents\\Sistema Registro de Trabajo\\my-app\\app', replaceInFile);
