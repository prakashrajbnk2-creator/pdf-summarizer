import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { PDFDocument } from 'pdf-lib';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

// ✅ FIXED pdfjs import (100% working)
import pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// ✅ Worker setup (safe)
if (pdfjsLib && (pdfjsLib as any).GlobalWorkerOptions) {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage
const users: any[] = [];
const loginHistory: any[] = [];
const summariesHistory: any[] = [];

// Admin user
(async () => {
  const hashed = await bcrypt.hash('1234', 10);
  users.push({
    name: 'Admin',
    email: 'admin@gmail.com',
    password: hashed,
    role: 'admin'
  });
})();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  app.use(express.json());

  // ---------------- AUTH ----------------

  app.post('/api/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields required' });
      }

      if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User exists' });
      }

      const hashed = await bcrypt.hash(password, 10);
      users.push({ name, email, password: hashed, role: 'user' });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = users.find(u => u.email === email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });

      loginHistory.unshift({
        email,
        time: new Date().toLocaleString()
      });

      res.json({ success: true, role: user.role });
    } catch {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/logins', (req, res) => {
    if (req.headers['x-user-role'] !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    res.json(loginHistory);
  });

  // ---------------- PDF EXTRACTION ----------------

  app.post('/api/extract', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      let text = '';

      if (req.file.mimetype === 'application/pdf') {
        const loadingTask = pdfjsLib.getDocument({ data: req.file.buffer });
        const pdf = await loadingTask.promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          text += strings.join(' ') + '\n';
        }
      } else if (req.file.mimetype === 'text/plain') {
        text = req.file.buffer.toString('utf8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      if (!text.trim()) {
        return res.status(400).json({ error: 'Empty or unreadable file' });
      }

      res.json({ text });

    } catch (err: any) {
      console.error("FULL ERROR:", err);
      res.status(500).json({ error: err.message || 'Processing failed' });
    }
  });

  // ---------------- PDF → WORD ----------------

  app.post('/api/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
      const loadingTask = pdfjsLib.getDocument({ data: req.file.buffer });
      const pdf = await loadingTask.promise;

      let text = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        text += strings.join(' ') + '\n';
      }

      const doc = new DocxDocument({
        sections: [{
          children: text.split('\n').map(line =>
            new Paragraph({ children: [new TextRun(line)] })
          )
        }]
      });

      const buffer = await Packer.toBuffer(doc);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.send(buffer);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Conversion failed' });
    }
  });

  // ---------------- WORD → PDF ----------------

  app.post('/api/word-to-pdf', upload.single('file'), async (req, res) => {
    try {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      const text = result.value;

      const doc = new jsPDF();
      const splitText = doc.splitTextToSize(text, 180);
      doc.text(splitText, 10, 10);

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdfBuffer);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Conversion failed' });
    }
  });

  // ---------------- MERGE PDFs ----------------

  app.post('/api/merge-pdfs', upload.array('files'), async (req, res) => {
    try {
      const merged = await PDFDocument.create();

      for (const file of req.files as Express.Multer.File[]) {
        if (file.mimetype !== 'application/pdf') continue;

        const pdf = await PDFDocument.load(file.buffer);
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }

      const bytes = await merged.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.send(Buffer.from(bytes));

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Merge failed' });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // ---------------- FRONTEND ----------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();