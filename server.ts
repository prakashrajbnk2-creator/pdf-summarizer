import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import pdfParse from 'pdf-parse'; // ✅ FIXED IMPORT
import bcrypt from 'bcryptjs';
import { PDFDocument } from 'pdf-lib';
import { Document as DocxDocument, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory storage
const users: any[] = [];
const loginHistory: any[] = [];
const summariesHistory: any[] = [];

// Bootstrap Admin
(async () => {
  const adminHashedPassword = await bcrypt.hash('1234', 10);
  users.push({
    name: 'Admin User',
    email: 'admin@gmail.com',
    password: adminHashedPassword,
    role: 'admin'
  });
})();

async function startServer() {
  const app = express();
  const PORT = 3000;

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
        return res.status(400).json({ success: false, error: 'All fields required' });
      }

      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'User exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = { name, email, password: hashedPassword, role: 'user' };
      users.push(newUser);

      res.json({ success: true, user: { name, email, role: 'user' } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Signup failed' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = users.find(u => u.email === email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      loginHistory.unshift({
        email: user.email,
        name: user.name,
        time: new Date().toLocaleString(),
        ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress
      });

      res.json({ success: true, email: user.email, role: user.role });
    } catch (error) {
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
      if (!req.file) return res.status(400).json({ error: 'No file' });

      const { buffer, mimetype, originalname } = req.file;

      let extractedText = '';

      if (mimetype === 'application/pdf') {
        const data = await pdfParse(buffer); // ✅ FIXED
        extractedText = data.text;
      } else if (mimetype === 'text/plain') {
        extractedText = buffer.toString('utf8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      if (!extractedText.trim()) {
        return res.status(400).json({ error: 'No text extracted' });
      }

      res.json({ text: extractedText, name: originalname });

    } catch (error) {
      console.error('Extraction error:', error);
      res.status(500).json({ error: 'Failed to process file' });
    }
  });

  // ---------------- PDF → WORD ----------------

  app.post('/api/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Upload PDF' });

      const data = await pdfParse(req.file.buffer); // ✅ FIXED
      const text = data.text;

      const doc = new DocxDocument({
        sections: [{
          children: text.split('\n').map(line =>
            new Paragraph({ children: [new TextRun(line)] })
          )
        }]
      });

      const buffer = await Packer.toBuffer(doc);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=file.docx`);
      res.send(buffer);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Conversion failed' });
    }
  });

  // ---------------- HEALTH ----------------

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // ---------------- VITE ----------------

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
    console.log(`Server running on ${PORT}`);
  });
}

startServer();