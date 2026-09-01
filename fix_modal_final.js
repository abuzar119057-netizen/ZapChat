const fs = require('fs');
const lines = fs.readFileSync('frontend/src/components/Sidebar.jsx', 'utf8').split('\n');

// Find the modal start line
let modalStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('═══ CREATE GROUP MODAL (iOS Premium) ═══')) {
    modalStart = i;
    break;
  }
}
console.log('Modal starts at line:', modalStart + 1);

// Find the </div> right before the modal
let closingDiv = modalStart - 1;
while (closingDiv >= 0 && lines[closingDiv].trim() === '') closingDiv--;
console.log('Closing div at line:', closingDiv + 1, ':', lines[closingDiv].trim());

// Verify it's a </div>
if (!lines[closingDiv].includes('</div>')) {
  console.log('ERROR: Expected </div> before modal!');
  process.exit(1);
}

// Extract the modal block (from modalStart to the line before export default)
let exportLine = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('export default Sidebar')) { exportLine = i; break; }
}
// Find the ");" that closes return, just before export
let returnClose = exportLine - 1;
while (returnClose >= 0 && lines[returnClose].trim() !== ');') returnClose--;
console.log('Return closes at line:', returnClose + 1);

// Modal block = lines[modalStart .. returnClose-1]
const modalBlock = lines.slice(modalStart, returnClose);
console.log('Modal block lines:', modalBlock.length);

// Remove modal from current position
lines.splice(modalStart, returnClose - modalStart);

// The closingDiv index is unchanged since modal was AFTER it
// Insert modal block BEFORE the closing </div>
lines.splice(closingDiv, 0, ...modalBlock);

fs.writeFileSync('frontend/src/components/Sidebar.jsx', lines.join('\n'));
console.log('DONE: Modal moved inside root div!');
