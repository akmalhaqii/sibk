// C4/C5: daftar pesan + rujukan halaman PDF + input tanya (dipakai di MiniChatCard & ChatbotPage)
import { useEffect, useRef, useState } from 'react';
import SourcePageLink from './SourcePageLink.jsx';

const METRIC_LABELS = {
  roe: 'ROE',
  roa: 'ROA',
  net_profit_margin: 'Margin Laba Bersih',
  operating_margin: 'Margin Usaha',
  current_ratio: 'Current Ratio',
  der: 'DER',
  debt_to_assets: 'Liabilitas/Aset',
  ocf_to_net_income: 'OCF/Laba Bersih',
  graham_fair_value: 'Nilai Wajar Graham',
  pbv: 'PBV',
  per: 'PER',
  eps: 'EPS',
  bvps: 'BVPS',
  tier: 'Tier',
  revenue: 'Pendapatan',
  net_income: 'Laba Bersih',
  net_income_parent: 'Laba Pemilik Entitas Induk',
  total_assets: 'Total Aset',
  total_liabilities: 'Total Liabilitas',
  total_equity: 'Total Ekuitas',
};

function formatRefChip(ref, fileId, fileUrl) {
  const label = METRIC_LABELS[ref.key] || ref.key;
  const pages = Array.isArray(ref.pages) ? ref.pages.filter((p) => Number.isFinite(p) && p > 0) : [];
  if (pages.length === 0) {
    return (
      <span key={ref.key} className="chat-ref-chip">
        {label}
      </span>
    );
  }
  return pages.map((page) => (
    <span key={`${ref.key}_${page}`} className="chat-ref-chip">
      <SourcePageLink fileId={fileId} fileUrl={fileUrl} page={page}>
        {label} · hal. {page}
      </SourcePageLink>
    </span>
  ));
}

export default function ChatThread({
  session,
  messages = [],
  streaming = false,
  streamingSentences = [],
  droppedLive = 0,
  busyNotice = null,
  error = null,
  onSend,
  autoFocus = false,
  emptyHint = 'Tanyakan arti rasio, kondisi tier, atau angka di laporan ini.',
}) {
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const fileId = session?.analysis?.file_id ?? session?.snapshot?.entity?.file_id ?? null;
  const fileUrl = session?.snapshot?.entity?.file_url ?? (fileId ? `/files/${fileId}.pdf` : null);
  const isBusy = Boolean(streaming || session?.pending);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus, session?.id]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, streamingSentences.length, session?.pending]);

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || isBusy || !session?.id || !onSend) return;
    setDraft('');
    await onSend(text, {
      onBusyRestore: (restored) => setDraft(restored),
    });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showPendingFromReload = Boolean(session?.pending && !streaming);

  return (
    <div className="chat-thread">
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.length === 0 && !streaming && !showPendingFromReload && (
          <p className="chat-empty">{emptyHint}</p>
        )}

        {messages.map((msg) => {
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="chat-msg-system">
                {msg.content}
              </div>
            );
          }
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="chat-msg-row chat-msg-row-user">
                <div className="chat-msg-user">{msg.content}</div>
              </div>
            );
          }
          const refs = Array.isArray(msg.refs) ? msg.refs : [];
          const droppedCount = Number(msg.dropped_sentences || 0);
          return (
            <div key={msg.id} className="chat-msg-row chat-msg-row-assistant">
              <div className="chat-msg-assistant">
                <p className="chat-msg-text">{msg.content}</p>
                <div className="chat-msg-meta">
                  {msg.label && <span className="chat-source-label">{msg.label}</span>}
                  {refs.length > 0 && (
                    <div className="chat-refs">
                      {refs.map((ref) => formatRefChip(ref, fileId, fileUrl))}
                    </div>
                  )}
                  {droppedCount > 0 && (
                    <p className="chat-dropped-note">
                      {droppedCount} kalimat disembunyikan karena tidak sesuai data.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(streaming || showPendingFromReload) && (
          <div className="chat-msg-row chat-msg-row-assistant">
            <div className="chat-msg-assistant chat-msg-streaming">
              {streamingSentences.length > 0 ? (
                <p className="chat-msg-text">
                  {streamingSentences.join(' ')}{' '}
                  <span className="writing-dot" aria-hidden="true" />
                </p>
              ) : (
                <div className="narrative-writing">
                  <span className="writing-dot" aria-hidden="true" />
                  <span>Qwen sedang menulis…</span>
                </div>
              )}
              {droppedLive > 0 && (
                <p className="chat-dropped-note">
                  {droppedLive} kalimat disembunyikan karena tidak sesuai data.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {busyNotice && (
        <div className="chat-notice-warn" role="status">
          {busyNotice}
        </div>
      )}

      {error && (
        <div className="chat-notice-error" role="alert">
          {error}
        </div>
      )}

      <div className="chat-composer">
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isBusy || !session?.id}
          placeholder={
            isBusy
              ? 'Menunggu jawaban selesai…'
              : 'Tulis pertanyaan… (Enter kirim, Shift+Enter baris baru)'
          }
          aria-label="Kolom pertanyaan ke Asisten AI"
        />
        <button
          type="button"
          className="btn-primary chat-send-btn"
          onClick={handleSubmit}
          disabled={isBusy || !session?.id || !draft.trim()}
        >
          Kirim
        </button>
      </div>

      <p className="chat-disclaimer">Bukan rekomendasi investasi.</p>
    </div>
  );
}
