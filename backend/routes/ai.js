const express = require('express');
const https = require('https');
const http = require('http');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Generate AI wallpaper image (proxy to avoid CORS/403)
// @route   GET /api/ai/wallpaper?prompt=...
router.get('/wallpaper', protect, (req, res) => {
  const { prompt } = req.query;
  
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  const seed = Math.floor(Math.random() * 1000000);
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=720&height=1280&nologo=true&seed=${seed}`;

  console.log('[AI Wallpaper] Generating:', imageUrl);

  // Follow redirects manually
  const fetchWithRedirects = (url, attempts = 0) => {
    if (attempts > 10) {
      console.error('[AI Wallpaper] Too many redirects');
      if (!res.headersSent) res.status(500).json({ message: 'Too many redirects' });
      return;
    }

    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (response) => {
      console.log(`[AI Wallpaper] Status: ${response.statusCode} (attempt ${attempts + 1})`);

      // Handle redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        console.log('[AI Wallpaper] Redirecting to:', response.headers.location);
        response.resume(); // Consume response to free up memory
        return fetchWithRedirects(response.headers.location, attempts + 1);
      }

      if (response.statusCode !== 200) {
        console.error(`[AI Wallpaper] Bad status: ${response.statusCode}`);
        if (!res.headersSent) res.status(502).json({ message: `AI service returned ${response.statusCode}` });
        return;
      }

      // Collect all chunks into a buffer first, then send
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[AI Wallpaper] Success! Image size: ${buffer.length} bytes`);
        
        if (buffer.length < 1000) {
          console.error('[AI Wallpaper] Image too small, likely an error page');
          if (!res.headersSent) res.status(502).json({ message: 'AI returned invalid image' });
          return;
        }

        res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.end(buffer);
      });
      response.on('error', (err) => {
        console.error('[AI Wallpaper] Stream error:', err.message);
        if (!res.headersSent) res.status(500).json({ message: 'Stream error' });
      });
    });

    request.on('error', (err) => {
      console.error('[AI Wallpaper] Request error:', err.message);
      if (!res.headersSent) res.status(500).json({ message: 'Failed to connect to AI service' });
    });

    // 2 minute timeout for AI generation
    request.setTimeout(120000, () => {
      console.error('[AI Wallpaper] Request timed out');
      request.destroy();
      if (!res.headersSent) res.status(504).json({ message: 'AI generation timed out' });
    });
  };

  fetchWithRedirects(imageUrl);
});

module.exports = router;
