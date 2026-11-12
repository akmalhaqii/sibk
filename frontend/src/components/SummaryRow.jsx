// C4: pembungkus baris Ringkasan Eksekutif (kiri 2/3) + kartu chat mini (kanan 1/3)
export default function SummaryRow({ chatOpen, summary, chatSlot }) {
  return (
    <div className={`summary-row ${chatOpen ? 'summary-row-open' : ''}`}>
      <div className="summary-main">{summary}</div>
      {chatOpen && (
        <div className="mini-chat-slot no-print">
          <div className="mini-chat-inner">{chatSlot}</div>
        </div>
      )}
    </div>
  );
}
