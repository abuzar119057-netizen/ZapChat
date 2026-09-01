const fs = require("fs");
let content = fs.readFileSync("frontend/src/components/StoryViewer.jsx", "utf8");

const badBlockStart = content.lastIndexOf("// Update local state for immediate feedback");

if (badBlockStart > 12000) { // Ensure it's the bad one
    const replaceStart = content.lastIndexOf("<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>", badBlockStart);
    const replaceEnd = content.indexOf("<button onClick={onClose}", badBlockStart);
    if (replaceStart > 0 && replaceEnd > 0) {
        content = content.substring(0, replaceStart) + 
            "<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>\n                    " + 
            content.substring(replaceEnd);
        fs.writeFileSync("frontend/src/components/StoryViewer.jsx", content);
        console.log("Successfully patched!");
    } else {
        console.log("Could not find start/end blocks");
    }
} else {
    console.log("Bad block not found at expected offset");
}
