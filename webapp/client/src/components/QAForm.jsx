import { useState, useEffect, useRef } from 'react';

export default function QAForm({ categories, selectedCategory, selectedSub, onAdded, onNavigate }) {
  const [cat, setCat] = useState(selectedCategory || '');
  const [sub, setSub] = useState(selectedSub || '');
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [loading, setLoading] = useState(false);
  const [undoInfo, setUndoInfo] = useState(null); // { cat, sub, q, a }
  const undoTimer = useRef(null);

  // Sync dropdowns when sidebar selection changes
  useEffect(() => {
    if (selectedCategory) setCat(selectedCategory);
    if (selectedSub) setSub(selectedSub);
  }, [selectedCategory, selectedSub]);

  // Auto-clear the undo button after 30 seconds
  useEffect(() => {
    if (!undoInfo) return;
    undoTimer.current = setTimeout(() => setUndoInfo(null), 30000);
    return () => clearTimeout(undoTimer.current);
  }, [undoInfo]);

  const subs = cat ? (categories[cat] || []) : [];

  const handleCatChange = (e) => {
    setCat(e.target.value);
    setSub('');
  };

  // Bug fix: changing subcategory now updates the entries list
  const handleSubChange = (e) => {
    const newSub = e.target.value;
    setSub(newSub);
    if (cat && newSub) {
      onNavigate(cat, newSub);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cat || !sub) return setStatus({ type: 'error', msg: 'Please select a category and subcategory.' });
    if (!q.trim() || !a.trim()) return setStatus({ type: 'error', msg: 'Question and answer cannot be empty.' });

    setLoading(true);
    setStatus(null);
    setUndoInfo(null);
    clearTimeout(undoTimer.current);

    try {
      const res = await fetch(`/api/qa/${encodeURIComponent(cat)}/${encodeURIComponent(sub)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, a }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      const saved = { cat, sub, q: q.trim(), a: a.trim() };
      setUndoInfo(saved);
      setStatus({ type: 'success', msg: `Entry added to "${sub}". ${data.total} total entries.` });
      setQ('');
      setA('');
      onAdded();
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!undoInfo) return;
    clearTimeout(undoTimer.current);
    try {
      const res = await fetch(`/api/qa/${encodeURIComponent(undoInfo.cat)}/${encodeURIComponent(undoInfo.sub)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: undoInfo.q, a: undoInfo.a }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not undo');
      setUndoInfo(null);
      setStatus({ type: 'success', msg: 'Entry removed successfully.' });
      onAdded();
    } catch (err) {
      setStatus({ type: 'error', msg: `Undo failed: ${err.message}` });
    }
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <span className="card-title">Add New Q&amp;A Entry</span>
        {cat && sub && <span className="breadcrumb">{cat.replace(/_/g, ' ')} › {sub}</span>}
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={cat} onChange={handleCatChange}>
                <option value="">Select category…</option>
                {Object.keys(categories).map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Subcategory</label>
              <select value={sub} onChange={handleSubChange} disabled={!cat}>
                <option value="">Select subcategory…</option>
                {subs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Question</label>
            <textarea
              placeholder="Type the question here…"
              value={q}
              onChange={e => setQ(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Answer</label>
            <textarea
              placeholder="Type the answer here…"
              value={a}
              onChange={e => setA(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Add Entry'}
            </button>
            {undoInfo && (
              <button type="button" className="btn-undo" onClick={handleUndo}>
                Undo
              </button>
            )}
            {status && (
              <span className={`status-msg ${status.type}`}>{status.msg}</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
