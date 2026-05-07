const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const fs = require('fs');

const COMMON_PATHS = {
  soffice: ['C:\\Program Files\\LibreOffice\\program\\soffice.exe'],
  '7z': ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe'],
  gs: [
    'C:\\Program Files\\gs\\gs10.04.0\\bin\\gswin64c.exe',
    'C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe'
  ]
};

function checkSystemBinary(cmd) {
  // Special check for bundled ffmpeg
  if (cmd === 'ffmpeg') {
    try {
      require.resolve('@ffmpeg-installer/ffmpeg');
      return 'Bundled';
    } catch (e) { }
  }

  try {
    execSync(`where ${cmd}`, { stdio: 'ignore' });
    return 'Found';
  } catch (e) {
    const paths = COMMON_PATHS[cmd] || [];
    for (const p of paths) {
      if (fs.existsSync(p)) return 'Found (Path)';
    }
    return 'Missing';
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);


// Start Server
app.listen(PORT, () => {
  const status = {
    libre: checkSystemBinary('soffice'),
    ffmpeg: checkSystemBinary('ffmpeg'),
    magick: checkSystemBinary('magick'),
    sevenZip: checkSystemBinary('7z'),
  };

  console.log(`
===================================================
 ByteMorph Server is LIVE! 
 Running on http://localhost:${PORT}
───────────────────────────────────────────────────
 Documents  → LibreOffice (${status.libre})
 Images     → Sharp + ImageMagick (${status.magick})
 Video      → FFmpeg (${status.ffmpeg})
 Audio      → FFmpeg (${status.ffmpeg})
 Data       → xlsx, csv-parse, fast-xml-parser
 Archives   → 7-Zip CLI (${status.sevenZip})
 Compress   → Sharp + FFmpeg + Zip
===================================================
  `);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[FATAL ERROR] Port ${PORT} is already occupied by another process.`);
    console.error(`💡 Tip: Check if another instance of ByteMorph is running, or run: netstat -ano | findstr :${PORT}`);
    process.exit(1);
  } else {
    console.error('\n[FATAL ERROR] Server failed to start:', err.message);
    process.exit(1);
  }
});
