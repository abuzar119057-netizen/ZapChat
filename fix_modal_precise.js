const fs = require('fs');
let lines = fs.readFileSync('frontend/src/components/Sidebar.jsx', 'utf8').split('\n');

// Find line 4454 (0-indexed: 4453) which is "    </div>"
// and line 4455 (0-indexed: 4454) which starts the modal comment
// We need to swap them: put modal BEFORE the </div>

// Find the closing </div> line just before the modal
let closingDivLine = -1;
let modalStartLine = -1;
let modalEndLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('═══════════════════ CREATE GROUP MODAL ═══════════════════')) {
    modalStartLine = i;
  }
  if (modalStartLine > -1 && i > modalStartLine && lines[i].trim() === '');
}

// Find the </div> right before modalStartLine
closingDivLine = modalStartLine - 1;
while (closingDivLine >= 0 && lines[closingDivLine].trim() === '') closingDivLine--;

console.log('closingDivLine:', closingDivLine, ':', lines[closingDivLine]);
console.log('modalStartLine:', modalStartLine, ':', lines[modalStartLine]);

// Find modal end - look for the line that ends the modal block
// The modal ends just before "  );\n};\n\nexport default Sidebar;"
let endLine = -1;
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('export default Sidebar')) { endLine = i; break; }
}
// Go back to find ");" which closes the return
let returnCloseLine = endLine - 1;
while (returnCloseLine >= 0 && lines[returnCloseLine].trim() !== ');') returnCloseLine--;
console.log('returnCloseLine:', returnCloseLine, ':', lines[returnCloseLine]);

// The modal block = from modalStartLine to returnCloseLine - 1 (exclusive)
const modalLines = lines.slice(modalStartLine, returnCloseLine);

// Remove modal lines from current position
lines.splice(modalStartLine, returnCloseLine - modalStartLine);

// Now find the closing </div> again (same index since lines changed)
// It should still be closingDivLine
console.log('After splice, closingDivLine line:', lines[closingDivLine]);

// Insert modal lines BEFORE the closing div
lines.splice(closingDivLine, 0, ...modalLines);

fs.writeFileSync('frontend/src/components/Sidebar.jsx', lines.join('\n'));
console.log('SUCCESS: Modal positioned correctly inside the root div!');
