# ByteMorph File Converter

ByteMorph is an ultra-fast, local-first, and modular full-stack file conversion application. Built for performance and privacy, ByteMorph processes files directly on your local node using native system binaries, ensuring lightning-fast execution and zero cloud data leakage.

---

## Curated Performance

ByteMorph has been recently refactored to focus on the **High-Performance Core** of common file formats. We've removed redundant conversion layers to provide a stabilized, professional-grade experience.

### Supported Formats

* **Documents:** DOCX, TXT, HTML (via LibreOffice)
* **Images:** JPG, PNG, GIF, SVG (via Sharp & ImageMagick)
* **Video:** MP4, 3GP, M4V (via FFmpeg)
* **Audio:** MP3, M4A (via FFmpeg)
* **Data:** CSV, JSON, XML, XLSX (via Native Parsers)
* **Archives:** ZIP, TAR, 7Z (via 7-Zip)

---

## Clean Infrastructure

ByteMorph uses a **Flattened Engine Architecture** for maximum maintainability:

* **Unified Routes:** All conversion and compression logic is handled through a single, intelligent router in `Server/routes.js`.
* **Native Engines:** Core logic for LibreOffice, FFmpeg, and Sharp is isolated in `Server/engines.js`.
* **One-Page Frontend:** A streamlined React experience where all components are modularized in `src/components/`.

---

## Tech Stack & Dependencies

### Frontend (Vite + React)

* **Framework:** React 19
* **Styling:** Modern Vanilla CSS (Glassmorphism)
* **UI Assets:** Lucide Icons & Syne Typography

### Backend (Node.js + Express)

* **Engine:** `express`, `multer`, `archiver`, `jsonwebtoken`
* **Image Processing:** `sharp`
* **A/V Processing:** `fluent-ffmpeg`
* **Data Parsing:** `xlsx`, `csv-parse`, `fast-xml-parser`

### System Prerequisites

To handle heavy lifting, ByteMorph requires the following binaries on your host machine:

1. **LibreOffice:** (soffice) for documents.
2. **7-Zip:** (7z) for archives.
3. **ImageMagick:** (magick) for SVG/advanced image processing.
*(Fluent-FFmpeg is bundled automatically!)*

---

## Getting Started

### 1. Install Dependencies

Open two terminals:

```bash
# Terminal 1: Frontend
npm install

# Terminal 2: Backend
cd Server
npm install
```

### 2. Launch

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
node server.js
```

### 3. Access

Navigate to `http://localhost:5173`. The backend will automatically output a **Diagnostic Dashboard** to the console confirming your system binary paths.

---

## Security & Privacy

* **Ephemeral Streams:** Files are processed into memory or temporary directories and instantly wiped upon response completion.
* **No Cloud Latency:** Your data never leaves your environment during the conversion cycle.

Enjoy converting at the speed of your hardware!
