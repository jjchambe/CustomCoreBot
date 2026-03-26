import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import QAForm from './components/QAForm.jsx';
import QAList from './components/QAList.jsx';
import FAQ from './components/FAQ.jsx';

export default function App() {
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);
  const [entries, setEntries] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFaq, setShowFaq] = useState(false);

  // Load category tree on mount
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/categories`)
      .then(r => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  // Load entries when selection changes or after adding
  useEffect(() => {
    if (!selectedCategory || !selectedSub) return;
    fetch(`${import.meta.env.BASE_URL}api/qa/${encodeURIComponent(selectedCategory)}/${encodeURIComponent(selectedSub)}`)
      .then(r => r.json())
      .then(setEntries)
      .catch(console.error);
  }, [selectedCategory, selectedSub, refreshKey]);

  const handleSelect = (cat, sub) => {
    setSelectedCategory(cat);
    setSelectedSub(sub);
    setEntries([]);
  };

  const handleAdded = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleNavigate = (cat, sub) => {
    setSelectedCategory(cat);
    setSelectedSub(sub);
    setEntries([]);
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>Lab Bot Maker</h1>
        <button className="btn-faq" onClick={() => setShowFaq(v => !v)}>
          {showFaq ? 'Close FAQ' : 'FAQ'}
        </button>
      </header>
      <div className="body">
        {Object.keys(categories).length > 0 && (
          <Sidebar
            categories={categories}
            selectedCategory={selectedCategory}
            selectedSub={selectedSub}
            onSelect={handleSelect}
          />
        )}
        <main className="main">
          {showFaq ? (
            <FAQ />
          ) : !selectedCategory ? (
            <div className="placeholder">
              <div className="placeholder-icon">←</div>
              <p>Select a category from the sidebar to get started.</p>
            </div>
          ) : (
            <>
              <QAForm
                categories={categories}
                selectedCategory={selectedCategory}
                selectedSub={selectedSub}
                onAdded={handleAdded}
                onNavigate={handleNavigate}
              />
              <QAList
                entries={entries}
                category={selectedCategory}
                subcategory={selectedSub}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
