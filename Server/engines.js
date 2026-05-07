const fs = require('fs');
const path = require('path');
const { execFile, execSync } = require('child_process');
const { promisify } = require('util');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const XLSX = require('xlsx');
const { parse: csvParse } = require('csv-parse/sync');
const { stringify: csvStringify } = require('csv-stringify/sync');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const execFileAsync = promisify(execFile);
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// --- LIbreOffice (Documents) ---
const LIBRE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
const LIBRE_CMD = fs.existsSync(LIBRE_PATH) ? LIBRE_PATH : 'soffice';

// --- Image Engines ---
const SHARP_FORMATS = ['jpg', 'jpeg', 'png', 'gif'];
const MAGICK_FORMATS = ['svg'];

// --- Audio Codecs ---
const AUDIO_CODECS = {
  mp3: { codec: 'libmp3lame', format: 'mp3', bitrate: '192k' },
  m4a: { codec: 'aac', format: 'ipod', bitrate: '192k' },
};

const ENGINES = {
  // DOCUMENTS (LibreOffice)
  document: async (inputPath, outputPath, targetExt) => {
    await execFileAsync(LIBRE_CMD, ['--headless', '--convert-to', targetExt, '--outdir', path.dirname(outputPath), inputPath]);
    if (!fs.existsSync(outputPath)) throw new Error('LibreOffice conversion failed');
  },

  // IMAGES (Sharp / Magick)
  image: async (inputPath, outputPath, targetExt, inputExt, quality = 90) => {
    const isMagick = MAGICK_FORMATS.includes(inputExt) || targetExt === 'svg';
    const target = targetExt === 'jpg' ? 'jpeg' : targetExt;

    if (isMagick) {
      const args = [];
      if (inputExt === 'svg') args.push('-density', '300');
      if (inputExt === 'gif') args.push(`${inputPath}[0]`); else args.push(inputPath);
      args.push('-strip', '-auto-orient');
      if (['jpg', 'jpeg'].includes(target)) args.push('-quality', quality.toString());
      args.push(outputPath);
      await execFileAsync('magick', args, { timeout: 60000 });
    } else {
      let p = sharp(inputPath);
      if (target === 'jpeg') p = p.jpeg({ quality, mozjpeg: true });
      else if (target === 'png') p = p.png({ compressionLevel: 6 });
      else if (target === 'gif') p = p.gif();
      else p = p.toFormat(target);
      await p.toFile(outputPath);
    }
  },

  // VIDEO & AUDIO (FFmpeg)
  media: async (inputPath, outputPath, type, targetExt, options = {}) => {
    return new Promise((resolve, reject) => {
      let cmd = ffmpeg(inputPath);
      if (type === 'audio') {
        const mapping = AUDIO_CODECS[targetExt];
        if (mapping) cmd = cmd.noVideo().audioCodec(mapping.codec).toFormat(mapping.format).audioBitrate(options.bitrate || mapping.bitrate);
      } else {
         cmd = cmd.outputOptions(['-preset ultrafast']);
         if (options.crf) cmd = cmd.outputOptions([`-crf ${options.crf}`, '-movflags +faststart']);
      }
      cmd.on('end', () => resolve(outputPath)).on('error', (err) => reject(err)).save(outputPath);
    });
  },

  // DATA (XLSX, CSV, JSON, XML)
  data: async (buffer, inputExt, targetExt) => {
    const parsers = {
      csv: (b) => csvParse(b.toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true }),
      json: (b) => {
        const p = JSON.parse(b.toString('utf-8'));
        return Array.isArray(p) ? p : [p];
      },
      xml: (b) => new XMLParser({ ignoreAttributes: false }).parse(b.toString('utf-8')),
      xlsx: (b) => XLSX.utils.sheet_to_json(XLSX.read(b, { type: 'buffer' }).Sheets[XLSX.read(b, { type: 'buffer' }).SheetNames[0]]),
    };
    const serializers = {
      csv: (d) => Buffer.from(csvStringify(d, { header: true }), 'utf-8'),
      json: (d) => Buffer.from(JSON.stringify(d, null, 2), 'utf-8'),
      xml: (d) => Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLBuilder({ format: true }).build({ root: { row: d } }), 'utf-8'),
      xlsx: (d) => {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(d), 'Sheet1');
        return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
      },
    };
    const data = parsers[inputExt] ? parsers[inputExt](buffer) : null;
    if (!data) throw new Error(`Input format .${inputExt} is not supported for data parsing.`);
    
    if (!serializers[targetExt]) throw new Error(`Target format .${targetExt} is not supported for data serialization.`);
    return serializers[targetExt](data);
  },

  // ARCHIVES (7-Zip)
  archive: async (inputPath, outputPath, targetExt) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-ext-'));
    try {
      await execFileAsync('7z', ['x', inputPath, `-o${tmpDir}`, '-y']);
      await execFileAsync('7z', ['a', `-t${targetExt === 'tar' ? 'tar' : (targetExt === '7z' ? '7z' : 'zip')}`, outputPath, path.join(tmpDir, '*'), '-y']);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
};

module.exports = ENGINES;
