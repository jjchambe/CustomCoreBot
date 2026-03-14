import { useState } from 'react';

const ChevronIcon = ({ open }) => (
  <svg
    className={`cat-chevron${open ? ' open' : ''}`}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Sidebar({ categories, selectedCategory, selectedSub, onSelect }) {
  const [open, setOpen] = useState(() => {
    const init = {};
    Object.keys(categories).forEach(k => { init[k] = true; });
    return init;
  });

  const toggle = (cat) => setOpen(prev => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <nav className="sidebar">
      <div className="sidebar-title">Knowledge Bases</div>
      {Object.entries(categories).map(([cat, subs]) => (
        <div className="cat-group" key={cat}>
          <div className="cat-header" onClick={() => toggle(cat)}>
            <ChevronIcon open={!!open[cat]} />
            {cat.replace(/_/g, ' ')}
          </div>
          {open[cat] && (
            <div className="sub-list">
              {subs.map(sub => (
                <div
                  key={sub}
                  className={`sub-item${selectedCategory === cat && selectedSub === sub ? ' active' : ''}`}
                  onClick={() => onSelect(cat, sub)}
                >
                  {sub}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
