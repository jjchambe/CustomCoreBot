require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendChangeEmail(action, category, subcategory, q, a) {
  const subject = `[Lab Bot Maker] ${action}: ${category} / ${subcategory}`;
  const body = `A change was made in Lab Bot Maker and needs your review.\n\nAction:      ${action}\nCategory:    ${category}\nSubcategory: ${subcategory}\n\nQuestion:\n${q}\n\nAnswer:\n${a}\n\nPlease review and approve or revert if needed.`;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.NOTIFY_TO,
      subject,
      text: body,
    });
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

const app = express();
const PORT = 3001;

const KB_ROOT = path.resolve(__dirname, '../knowledgebases');

app.use(cors());
app.use(express.json());

// Resolve and validate a knowledgebase path to prevent traversal
function resolveSafePath(category, subcategory) {
  const target = path.resolve(KB_ROOT, category, subcategory);
  if (!target.startsWith(KB_ROOT + path.sep)) return null;
  return target;
}

// GET /api/categories → { CATEGORY: ['sub1', 'sub2', ...], ... }
app.get('/api/categories', (req, res) => {
  try {
    const categories = {};
    const topDirs = fs.readdirSync(KB_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const cat of topDirs) {
      const catPath = path.join(KB_ROOT, cat);
      const subs = fs.readdirSync(catPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      categories[cat] = subs;
    }
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/qa/:category/:subcategory → Q&A array
app.get('/api/qa/:category/:subcategory', (req, res) => {
  const { category, subcategory } = req.params;
  const dir = resolveSafePath(category, subcategory);
  if (!dir) return res.status(400).json({ error: 'Invalid path' });

  const file = path.join(dir, 'qa.json');
  if (!fs.existsSync(file)) return res.json([]);

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// POST /api/qa/:category/:subcategory → append { q, a }
app.post('/api/qa/:category/:subcategory', (req, res) => {
  const { category, subcategory } = req.params;
  const { q, a } = req.body;

  if (!q || !a) return res.status(400).json({ error: 'Both q and a are required' });

  const dir = resolveSafePath(category, subcategory);
  if (!dir) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Subcategory not found' });

  const file = path.join(dir, 'qa.json');
  let entries = [];
  if (fs.existsSync(file)) {
    try {
      entries = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      entries = [];
    }
  }

  entries.push({ q: q.trim(), a: a.trim() });
  fs.writeFileSync(file, JSON.stringify(entries, null, 4), 'utf8');
  sendChangeEmail('Entry Added', category, subcategory, q.trim(), a.trim());
  res.json({ success: true, total: entries.length });
});

// DELETE /api/qa/:category/:subcategory → remove a specific { q, a } entry (undo)
app.delete('/api/qa/:category/:subcategory', (req, res) => {
  const { category, subcategory } = req.params;
  const { q, a } = req.body;

  if (!q || !a) return res.status(400).json({ error: 'Both q and a are required' });

  const dir = resolveSafePath(category, subcategory);
  if (!dir) return res.status(400).json({ error: 'Invalid path' });

  const file = path.join(dir, 'qa.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });

  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return res.status(500).json({ error: 'Failed to read file' });
  }

  // Find the last matching entry (handles accidental duplicates gracefully)
  let idx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].q.trim() === q.trim() && entries[i].a.trim() === a.trim()) {
      idx = i;
      break;
    }
  }

  if (idx === -1) return res.status(404).json({ error: 'Entry not found — it may have already been removed.' });

  entries.splice(idx, 1);
  fs.writeFileSync(file, JSON.stringify(entries, null, 4), 'utf8');
  sendChangeEmail('Entry Removed', category, subcategory, q.trim(), a.trim());
  res.json({ success: true, total: entries.length });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
