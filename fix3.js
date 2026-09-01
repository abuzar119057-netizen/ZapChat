const fs = require('fs');
let lines = fs.readFileSync('StoryViewer_current.txt', 'utf8').split('\n');

const correctLines = `                                    👑 Admin Pro
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
            </div>`.split('\n');

// Remove from index 431 to 639 (209 lines)
lines.splice(431, 209, ...correctLines);

let text = lines.join('\n');
text = text.replace('            )}\r\n            )}', '            )}');
text = text.replace('            )}\n            )}', '            )}');

fs.writeFileSync('frontend/src/components/StoryViewer.jsx', text);
console.log('Fixed file cleanly via exact line indices.');
