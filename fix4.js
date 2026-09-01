const fs = require('fs');
let lines = fs.readFileSync('frontend/src/components/StoryViewer.jsx', 'utf8').split(/\r?\n/);
for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].trim() === ')}' && lines[i+1].trim() === ')}') {
        console.log('Found duplicate )} at lines', i+1, i+2);
        lines.splice(i+1, 1); // remove the duplicate
        break; // Assuming only one
    }
}
fs.writeFileSync('frontend/src/components/StoryViewer.jsx', lines.join('\n'));
console.log('Removed duplicate )}');
