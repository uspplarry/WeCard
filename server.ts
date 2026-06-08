import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'data.json');
const SECRET_KEY = process.env.SECRET_KEY || 'wecard-super-secure-key-2026';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'password';

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Simple JSON DB
interface Card {
  id: string;
  slug: string;
  wxid: string;
  qrcode: string; // filename
  is_default: boolean;
}

const readDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ cards: [] }));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as { cards: Card[] };
};

const writeDb = (data: any) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  
  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- API Routes ---
  
  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      jwt.verify(token, SECRET_KEY);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
    res.json({ success: true });
  });

  app.get('/api/auth/session', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ authenticated: false });
    try {
      jwt.verify(token, SECRET_KEY);
      return res.json({ authenticated: true });
    } catch {
      return res.json({ authenticated: false });
    }
  });

  app.get('/api/cards', (req, res) => {
    const db = readDb();
    res.json(db.cards);
  });

  app.post('/api/cards', requireAuth, upload.single('file'), (req, res) => {
    const db = readDb();
    const { wxid, is_default, slug: customSlug } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Image required' });
    if (!wxid) return res.status(400).json({ error: 'Wechat ID required' });

    let slug = customSlug?.trim() || crypto.randomUUID().slice(0, 6);
    
    // Check reserved slugs
    const reservedSlugs = ['login', 'admin', 'api', 'uploads', 'assets', 'k'];
    if (reservedSlugs.includes(slug.toLowerCase())) {
        return res.status(400).json({ error: 'Reserved URL suffix' });
    }

    // ensure unique slug
    if (db.cards.find(c => c.slug === slug)) {
        return res.status(400).json({ error: 'Slug already exists' });
    }

    let isDefault = is_default === 'true' || is_default === true;
    if (db.cards.length === 0) {
      isDefault = true;
    }

    if (isDefault) {
      db.cards.forEach(c => c.is_default = false);
    }

    const newCard: Card = {
      id: crypto.randomUUID(),
      slug,
      wxid,
      qrcode: file.filename,
      is_default: isDefault
    };

    db.cards.push(newCard);
    writeDb(db);
    res.json(newCard);
  });

  app.delete('/api/cards/:id', requireAuth, (req, res) => {
    const db = readDb();
    const target = db.cards.find(c => c.id === req.params.id);
    if (target) {
        const filePath = path.join(UPLOADS_DIR, target.qrcode);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    db.cards = db.cards.filter(c => c.id !== req.params.id);
    if (target?.is_default && db.cards.length > 0) {
        db.cards[0].is_default = true;
    }
    writeDb(db);
    res.json({ success: true });
  });

  app.patch('/api/cards/:id/default', requireAuth, (req, res) => {
    const db = readDb();
    db.cards.forEach(c => {
      c.is_default = (c.id === req.params.id);
    });
    writeDb(db);
    res.json({ success: true });
  });

  app.get('/api/cards/default', (req, res) => {
    const db = readDb();
    const defaultCard = db.cards.find(c => c.is_default) || db.cards[0];
    if (defaultCard) {
      res.json(defaultCard);
    } else {
      res.status(404).json({ error: 'No default card found' });
    }
  });

  app.get('/api/cards/:slug', (req, res) => {
    const db = readDb();
    const card = db.cards.find(c => c.slug === req.params.slug);
    if (card) {
      res.json(card);
    } else {
      res.status(404).json({ error: 'Card not found' });
    }
  });


  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
