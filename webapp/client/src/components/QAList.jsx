export default function QAList({ entries, category, subcategory }) {
  return (
    <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <span className="card-title">Existing Entries</span>
        {entries.length > 0 && <span className="badge">{entries.length} entries</span>}
      </div>
      {/* card-body must be a flex column with minHeight:0 so qa-scroll can fill it and scroll */}
      <div className="card-body" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
        {entries.length === 0 ? (
          <p className="qa-empty">No entries yet for <strong>{subcategory}</strong>.</p>
        ) : (
          <div className="qa-scroll">
            {entries.map((item, i) => (
              <div className="qa-item" key={i}>
                <p className="qa-q">{item.q}</p>
                <p className="qa-a">{item.a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
