const fs = require('fs');
const path = require('path');
const componentsDir = path.join(process.cwd(), 'components');

function processDir(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;
            
            // Replace bg-blue-500 hover:bg-blue-600
            if (content.includes('bg-blue-500 hover:bg-blue-600')) {
                content = content.replace(/bg-blue-500 hover:bg-blue-600/g, 'bg-blue-600 hover:bg-blue-700');
                updated = true;
            }
            // Replace standalone bg-blue-500 with text-white (probably buttons)
            if (content.match(/bg-blue-500.*?text-white/g) || content.match(/text-white.*?bg-blue-500/g)) {
                content = content.replace(/bg-blue-500/g, (match, offset, string) => {
                    // Quick heuristic: if it's in a className string that has text-white, replace it.
                    // Actually, just replace all bg-blue-500 with bg-blue-600 to be safe, but wait:
                    // There are backgrounds and badges that use bg-blue-500. So let's stick to the hover pair or specific known buttons.
                    return match;
                });
            }
            
            if (updated) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    });
}
processDir(componentsDir);
console.log('Done replacing hover combinations.');
