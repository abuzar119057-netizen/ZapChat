export const generateDefaultAvatar = (name = 'User', isGroup = false) => {
    // 1. Generate a stable hash from the name string
    let hash = 0;
    const safeName = String(name || 'User');
    for (let i = 0; i < safeName.length; i++) {
        hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // 2. Generate "Pro Light" colors
    // We use HSL. 
    // Hue: 0-360 based on hash.
    // Saturation: 60-80% (soft but colorful).
    // Lightness: 85-95% (very light/pastel background).
    const h = Math.abs(hash) % 360;
    const s = 65 + (Math.abs(hash) % 15);
    const l = 88 + (Math.abs(hash) % 7);
    
    const bgColor = `hsl(${h}, ${s}%, ${l}%)`;
    
    // Icon color should be a darker shade of the same hue for a professional monochrome look
    const iconColor = `hsl(${h}, ${s}%, ${l - 50}%)`;

    // 3. User & Group SVG Icons (Lucide-React style paths)
    const userSvg = `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />`;
    const groupSvg = `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />`;

    // 4. Construct the full SVG wrapper
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
            <rect width="120" height="120" fill="${bgColor}" />
            <g transform="translate(36, 36) scale(2)">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    ${isGroup ? groupSvg : userSvg}
                </svg>
            </g>
        </svg>
    `;

    // 5. Encode as Data URI
    // Use encodeURIComponent to ensure special characters like # and % are handled safely in URLs
    return \`data:image/svg+xml;utf8,\${encodeURIComponent(svg.trim())}\`;
};
