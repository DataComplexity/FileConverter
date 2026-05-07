const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const os = require('os');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const engines = require('./engines');

const router = express.Router();
const SECRET = 'bytemorph_secret_key_123';

// Storage Setup
const diskStorage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => cb(null, `bm-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: diskStorage, limits: { fileSize: 50 * 1024 * 1024, files: 3 } });

const cleanup = (paths) => paths.forEach(p => { if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) { } });

// --- CONVERSION ---
router.post('/convert/:category', upload.array('files', 3), async (req, res) => {
  const { category } = req.params;
  const targetFormat = req.body.targetFormat?.toLowerCase();
  const tempFiles = req.files.map(f => f.path);

  console.log(`[DEBUG] Conversion Request: Category=${category}, Target=${targetFormat}, Files=${req.files.length}`);

  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    const results = [];
    for (const file of req.files) {
      const inputExt = file.originalname.split('.').pop().toLowerCase();
      const outputName = `${file.originalname.split('.').slice(0, -1).join('.')}.${targetFormat}`;
      const outputPath = path.join(os.tmpdir(), `out-${Date.now()}-${outputName}`);
      tempFiles.push(outputPath);

      console.log(`  -> Processing Part: ${file.originalname} (${inputExt})`);

      if (category === 'data') {
        const buffer = await engines.data(fs.readFileSync(file.path), inputExt, targetFormat);
        results.push({ name: outputName, buffer });
      } else {
        if (category === 'document')      await engines.document(file.path, outputPath, targetFormat);
        else if (category === 'image')    await engines.image(file.path, outputPath, targetFormat, inputExt);
        else if (category === 'video' || category === 'audio') await engines.media(file.path, outputPath, category, targetFormat);
        else if (category === 'archive')  await engines.archive(file.path, outputPath, targetFormat);
        else throw new Error(`Unsupported category: ${category}`);
        
        results.push({ name: outputName, path: outputPath });
      }
    }

    console.log(`[DEBUG] Conversion Successful. Sending ${results.length} item(s).`);

    res.on('finish', () => cleanup(tempFiles));
    
    if (results.length === 1) {
      const r = results[0];
      res.setHeader('Content-Disposition', `attachment; filename="${r.name}"`);
      return r.buffer ? res.send(r.buffer) : res.download(r.path, r.name);
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Disposition', 'attachment; filename="bytemorph_converted.zip"');
    archive.pipe(res);
    results.forEach(r => r.buffer ? archive.append(r.buffer, { name: r.name }) : archive.file(r.path, { name: r.name }));
    await archive.finalize();

  } catch (err) {
    cleanup(tempFiles);
    res.status(500).json({ error: 'Conversion failed', details: err.message });
  }
});

// --- COMPRESSION ---
const COMP_LEVELS = { low: { q: 85, crf: 23, b: '192k' }, medium: { q: 70, crf: 28, b: '128k' }, high: { q: 50, crf: 35, b: '96k' } };

router.post('/compress', upload.array('files', 3), async (req, res) => {
  const level = COMP_LEVELS[req.body.level] || COMP_LEVELS.medium;
  const tempFiles = req.files.map(f => f.path);

  try {
    const results = [];
    for (const file of req.files) {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const outputName = `${file.originalname.split('.').slice(0, -1).join('.')}_compressed.${ext}`;
      const outputPath = path.join(os.tmpdir(), `comp-${Date.now()}-${outputName}`);
      tempFiles.push(outputPath);

      if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) await engines.image(file.path, outputPath, ext, ext, level.q);
      else if (['mp4', '3gp', 'm4v'].includes(ext)) await engines.media(file.path, outputPath, 'video', ext, { crf: level.crf });
      else if (['mp3', 'm4a'].includes(ext)) await engines.media(file.path, outputPath, 'audio', ext, { bitrate: level.b });
      else fs.copyFileSync(file.path, outputPath);

      results.push({ name: outputName, path: outputPath });
    }

    res.on('finish', () => cleanup(tempFiles));
    if (results.length === 1) return res.download(results[0].path, results[0].name);

    const archive = archiver('zip');
    res.setHeader('Content-Disposition', 'attachment; filename="bytemorph_compressed.zip"');
    archive.pipe(res);
    results.forEach(r => archive.file(r.path, { name: r.name }));
    await archive.finalize();
  } catch (err) {
    cleanup(tempFiles);
    res.status(500).json({ error: 'Compression failed', details: err.message });
  }
});

// --- AUTH (Simplified) ---
const USERS = []; // In-memory for simplicity as "extra" code is being removed
router.post('/auth/signup', (req, res) => {
  const { email, password, name } = req.body;
  if (USERS.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });
  const user = { id: Date.now(), name, email, password };
  USERS.push(user);
  res.json({ token: jwt.sign({ id: user.id }, SECRET), user: { name, email } });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: jwt.sign({ id: user.id }, SECRET), user: { name: user.name, email: user.email } });
});

module.exports = router;
