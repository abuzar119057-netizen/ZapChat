const fs = require("fs");
let text = fs.readFileSync("frontend/src/components/StoryViewer.jsx", "utf8");

let idx1 = text.lastIndexOf("border: '1.2px solid rgba(255, 255, 255, 0.5)'\n                                }}>");
if (idx1 === -1) {
    idx1 = text.lastIndexOf("border: '1.2px solid rgba(255, 255, 255, 0.5)'\r\n                                }}>");
}

let idx2 = text.indexOf("{/* Content Area */}", idx1);

if (idx1 !== -1 && idx2 !== -1) {
    let replacement = `border: '1.2px solid rgba(255, 255, 255, 0.5)'
                                }}>
                                    👑 Admin Pro
                                </span>
                            )}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                            {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>
            </div>
            `;
            
    let newText = text.substring(0, idx1) + replacement + text.substring(idx2);
    fs.writeFileSync("frontend/src/components/StoryViewer.jsx", newText);
    console.log("Patched successfully!");
} else {
    console.log("Could not find indices:", idx1, idx2);
}
