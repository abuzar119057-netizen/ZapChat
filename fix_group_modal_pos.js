const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Sidebar.jsx', 'utf8');

// The modal was inserted after the closing </div> of return
// We need to:
// 1. Remove the misplaced modal block
// 2. Re-insert it BEFORE the final </div> inside return

// Extract the modal block
const modalStart = '\n      {/* ═══════════════════ CREATE GROUP MODAL ═══════════════════ */}';
const modalEndMarker = '\n  );\n};\n\nexport default Sidebar;';

const modalStartIdx = content.indexOf(modalStart);
const modalEndIdx = content.indexOf(modalEndMarker);

if (modalStartIdx === -1) {
  console.log('ERROR: Modal start not found');
  process.exit(1);
}

// Extract the modal JSX
const modalBlock = content.substring(modalStartIdx, modalEndIdx);

// Remove it from current position
content = content.substring(0, modalStartIdx) + content.substring(modalEndIdx);

// Now insert before the last </div> inside the return statement
// The return closes with:  \n    </div>\n\n  );\n
const insertBefore = '\n    </div>\n\n  );\n};\n\nexport default Sidebar;';
if (content.includes(insertBefore)) {
  content = content.replace(insertBefore, '\n    </div>' + modalBlock + '\n\n  );\n};\n\nexport default Sidebar;');
  fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
  console.log('SUCCESS: Modal moved inside return()!');
} else {
  // Try alternate pattern
  const alt = '\n    </div>\n  );\n};\n\nexport default Sidebar;';
  if (content.includes(alt)) {
    content = content.replace(alt, '\n    </div>' + modalBlock + '\n  );\n};\n\nexport default Sidebar;');
    fs.writeFileSync('frontend/src/components/Sidebar.jsx', content);
    console.log('SUCCESS (alt): Modal moved inside return()!');
  } else {
    console.log('Could not find return closing pattern. Last 200 chars:');
    console.log(JSON.stringify(content.slice(-300)));
  }
}
