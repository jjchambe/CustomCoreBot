require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  authMethod: 'PLAIN',
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Pending review store: token → { action, category, subcategory, q, a }
// Persisted to disk so restarts don't lose pending reviews
const PENDING_FILE = path.resolve(__dirname, 'pending-reviews.json');

function loadPending() {
  try {
    return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function savePending(pending) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(pending, null, 2), 'utf8');
}

async function sendChangeEmail(action, category, subcategory, q, a, token) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

  const approveUrl = `${base}/api/review/${token}/approve`;
  const rejectUrl  = `${base}/api/review/${token}/reject`;

  const subject = `[Lab Bot Maker] ${action}: ${category} / ${subcategory}`;
  const body = [
    `A change was made in Lab Bot Maker and needs your review.`,
    ``,
    `Action:      ${action}`,
    `Category:    ${category}`,
    `Subcategory: ${subcategory}`,
    ``,
    `Question:`,
    q,
    ``,
    `Answer:`,
    a,
    ``,
    `─────────────────────────────`,
    `APPROVE (keep the change):`,
    approveUrl,
    ``,
    `REJECT (revert the change):`,
    rejectUrl,
  ].join('\n');

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

// Serve React frontend static files
const CLIENT_DIST = path.resolve(__dirname, 'client/dist');
app.use(express.static(CLIENT_DIST));

// Resolve and validate a knowledgebase path to prevent traversal
function resolveSafePath(category, subcategory) {
  const target = path.resolve(KB_ROOT, category, subcategory);
  if (!target.startsWith(KB_ROOT + path.sep)) return null;
  return target;
}

function htmlPage(title, message, color) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; background: #f4f4f4; }
  .box { background: #fff; border-radius: 8px; padding: 40px 48px; text-align: center;
         box-shadow: 0 2px 12px rgba(0,0,0,.1); max-width: 480px; }
  h2 { color: ${color}; margin-top: 0; }
  p { color: #555; line-height: 1.5; }
  a { color: #4a90e2; text-decoration: none; }
</style></head><body>
<div class="box"><h2>${title}</h2><p>${message}</p>
<p><a href="/corebot/">← Back to Lab Bot Maker</a></p>
</div></body></html>`;
}

function confirmPage(token, action, item) {
  const isApprove = action === 'approve';
  const btnColor = isApprove ? '#27ae60' : '#e74c3c';
  const btnLabel = isApprove ? 'Yes, Approve' : 'Yes, Reject';
  const title = isApprove ? 'Confirm Approval' : 'Confirm Rejection';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; background: #f4f4f4; }
  .box { background: #fff; border-radius: 8px; padding: 40px 48px; text-align: center;
         box-shadow: 0 2px 12px rgba(0,0,0,.1); max-width: 520px; }
  h2 { color: #333; margin-top: 0; }
  .meta { background: #f9f9f9; border-radius: 6px; padding: 16px; text-align: left;
          margin: 16px 0; font-size: 14px; color: #444; line-height: 1.6; }
  .meta strong { color: #222; }
  .actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
  button { padding: 10px 28px; border: none; border-radius: 6px; font-size: 15px;
           cursor: pointer; font-weight: 600; }
  .btn-confirm { background: ${btnColor}; color: #fff; }
  .btn-confirm:hover { opacity: 0.88; }
  .btn-cancel { background: #eee; color: #555; }
  .btn-cancel:hover { background: #ddd; }
  a { color: #4a90e2; text-decoration: none; }
</style></head><body>
<div class="box">
  <h2>${title}</h2>
  <div class="meta">
    <strong>Action:</strong> ${item.action}<br>
    <strong>Category:</strong> ${item.category} › ${item.subcategory}<br>
    <strong>Q:</strong> ${item.q}<br>
    <strong>A:</strong> ${item.a}
  </div>
  <p style="color:#555">Are you sure you want to <strong>${action}</strong> this change?</p>
  <div class="actions">
    <form method="POST" action="/api/review/${token}/${action}">
      <button class="btn-confirm" type="submit">${btnLabel}</button>
    </form>
    <a href="/corebot/"><button class="btn-cancel" type="button">Cancel</button></a>
  </div>
</div></body></html>`;
}

// GET /api/review/:token/approve → show confirmation page (safe for email link pre-fetching)
app.get('/api/review/:token/approve', (req, res) => {
  const pending = loadPending();
  const item = pending[req.params.token];
  if (!item) {
    return res.status(410).send(htmlPage(
      'Already Handled',
      'This review link has already been used or has expired.',
      '#e67e22'
    ));
  }
  res.send(confirmPage(req.params.token, 'approve', item));
});

// POST /api/review/:token/approve → write the pending change to disk
app.post('/api/review/:token/approve', (req, res) => {
  const pending = loadPending();
  const item = pending[req.params.token];
  if (!item) {
    return res.status(410).send(htmlPage(
      'Already Handled',
      'This review link has already been used or has expired.',
      '#e67e22'
    ));
  }

  const dir = resolveSafePath(item.category, item.subcategory);
  if (!dir) return res.status(400).send(htmlPage('Error', 'Invalid category path.', '#e74c3c'));
  const file = path.join(dir, 'qa.json');

  try {
    if (item.action === 'Entry Added') {
      let entries = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      entries.push({ q: item.q, a: item.a });
      fs.writeFileSync(file, JSON.stringify(entries, null, 4), 'utf8');
    } else if (item.action === 'Entry Removed') {
      let entries = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      let idx = -1;
      for (let i = entries.length - 1; i >= 0; i--) {
        if (entries[i].q.trim() === item.q.trim() && entries[i].a.trim() === item.a.trim()) {
          idx = i; break;
        }
      }
      if (idx !== -1) {
        entries.splice(idx, 1);
        fs.writeFileSync(file, JSON.stringify(entries, null, 4), 'utf8');
      }
    }

    delete pending[req.params.token];
    savePending(pending);

    res.send(htmlPage(
      'Change Approved ✓',
      `The entry in <strong>${item.category} › ${item.subcategory}</strong> has been saved.`,
      '#27ae60'
    ));
  } catch (err) {
    res.status(500).send(htmlPage('Error', `Could not save: ${err.message}`, '#e74c3c'));
  }
});

// GET /api/review/:token/reject → show confirmation page (safe for email link pre-fetching)
app.get('/api/review/:token/reject', (req, res) => {
  const pending = loadPending();
  const item = pending[req.params.token];
  if (!item) {
    return res.status(410).send(htmlPage(
      'Already Handled',
      'This review link has already been used or has expired.',
      '#e67e22'
    ));
  }
  res.send(confirmPage(req.params.token, 'reject', item));
});

// POST /api/review/:token/reject → discard the pending change (nothing was written)
app.post('/api/review/:token/reject', (req, res) => {
  const pending = loadPending();
  const item = pending[req.params.token];
  if (!item) {
    return res.status(410).send(htmlPage(
      'Already Handled',
      'This review link has already been used or has expired.',
      '#e67e22'
    ));
  }
  delete pending[req.params.token];
  savePending(pending);
  res.send(htmlPage(
    'Change Rejected ✗',
    `The entry in <strong>${item.category} › ${item.subcategory}</strong> was discarded.`,
    '#e74c3c'
  ));
});

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

// POST /api/qa/:category/:subcategory → hold for approval, do NOT write yet
app.post('/api/qa/:category/:subcategory', (req, res) => {
  const { category, subcategory } = req.params;
  const { q, a } = req.body;

  if (!q || !a) return res.status(400).json({ error: 'Both q and a are required' });

  const dir = resolveSafePath(category, subcategory);
  if (!dir) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Subcategory not found' });

  const token = crypto.randomBytes(24).toString('hex');
  const pending = loadPending();
  pending[token] = { action: 'Entry Added', category, subcategory, q: q.trim(), a: a.trim() };
  savePending(pending);

  sendChangeEmail('Entry Added', category, subcategory, q.trim(), a.trim(), token);
  res.json({ success: true, pending: true });
});

// DELETE /api/qa/:category/:subcategory → hold removal for approval, do NOT write yet
app.delete('/api/qa/:category/:subcategory', (req, res) => {
  const { category, subcategory } = req.params;
  const { q, a } = req.body;

  if (!q || !a) return res.status(400).json({ error: 'Both q and a are required' });

  const dir = resolveSafePath(category, subcategory);
  if (!dir) return res.status(400).json({ error: 'Invalid path' });

  const file = path.join(dir, 'qa.json');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });

  // Verify the entry exists before queuing removal
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return res.status(500).json({ error: 'Failed to read file' });
  }

  const exists = entries.some(e => e.q.trim() === q.trim() && e.a.trim() === a.trim());
  if (!exists) return res.status(404).json({ error: 'Entry not found — it may have already been removed.' });

  const token = crypto.randomBytes(24).toString('hex');
  const pending = loadPending();
  pending[token] = { action: 'Entry Removed', category, subcategory, q: q.trim(), a: a.trim() };
  savePending(pending);

  sendChangeEmail('Entry Removed', category, subcategory, q.trim(), a.trim(), token);
  res.json({ success: true, pending: true });
});

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
