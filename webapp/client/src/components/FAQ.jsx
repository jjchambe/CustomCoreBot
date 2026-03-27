const FAQS = [
  {
    q: 'What is Lab Bot Maker?',
    a: 'Lab Bot Maker is an internal tool for building and maintaining the Q&A knowledge base that can be used to power your own very lab\'s AI assistant. Anyone can submit questions and answers for any piece of microscopy equipment or software, which are then reviewed and added to the database.',
  },
  {
    q: 'How do I add a new Q&A entry?',
    a: 'Select a category and subcategory from the sidebar (e.g. MICROSCOPE_PARTS → Nikon A1R), then type your question and answer in the form and click "Add Entry". Your submission will be sent for review before it goes live.',
  },
  {
    q: 'What happens after I submit an entry?',
    a: 'Your submission is held in a pending queue and an email is sent to the administrator for review. You will not see your entry in the list until it has been approved. This can take up to 1–2 business days.',
  },
  {
    q: 'How does the approval process work?',
    a: 'The administrator receives an email with your submission and can approve or reject it with a single click. Approved entries are immediately added to the knowledge base. Rejected entries are discarded with no further action.',
  },
  {
    q: 'Can I undo a submission?',
    a: 'Yes, immediately after adding an entry an "Undo" button appears. Clicking it removes the entry before it enters the review queue. After 30 seconds the entry is locked in for review and can only be removed by the administrator. You can send an email to the us if you want to revert your submission after 30 seconds passed.',
  },
  {
    q: 'What categories and subcategories are available?',
    a: 'Categories are organized by type: MICROSCOPE_PARTS (e.g. Nikon A1R, Zyla, Prime95), MICROSCOPE_STANDS (e.g. Nikon Ti2, Keyence BZ-X810), and SOFTWARE (e.g. Elements, Fiji, QuPath). If you need a new subcategory added, contact us.',
  },
  {
    q: 'How do I write a good Q&A entry?',
    a: 'Write the question as a user would ask it, try to be short and specific. The answer should be direct and accurate, ideally 1–3 sentences. Avoid jargon where possible, and focus on one topic per entry. If something needs a long explanation, break it into multiple entries.',
  },
  {
    q: 'Who can submit entries?',
    a: 'Anyone with access to this tool can submit entries. All submissions go through admin review, so there is no risk of bad data going live accidentally.',
  },
];

export default function FAQ() {
  return (
    <div className="faq-panel">
      <div className="faq-header">
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <p className="faq-subtitle">Everything you need to know about submitting knowledge base entries.</p>
      </div>
      <div className="faq-list">
        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}

function FAQItem({ q, a }) {
  return (
    <div className="faq-item">
      <div className="faq-q">{q}</div>
      <div className="faq-a">{a}</div>
    </div>
  );
}
