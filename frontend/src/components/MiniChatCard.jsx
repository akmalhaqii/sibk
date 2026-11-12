// C4: kartu chat mini di samping Ringkasan Eksekutif
import { useEffect } from 'react';
import ChatThread from './ChatThread.jsx';

export default function MiniChatCard({
  session,
  messages,
  streaming,
  streamingSentences,
  droppedLive,
  busyNotice,
  error,
  onSend,
  onClose,
  onExpand,
  canExpand = true,
}) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const ticker = session?.analysis?.ticker;
  const title = ticker ? `Asisten AI · ${ticker}` : 'Asisten AI';

  return (
    <section className="card mini-chat-card no-print" aria-label="Kartu Chat Asisten AI">
      <div className="mini-chat-header">
        <div className="mini-chat-title-wrap">
          <h3 className="mini-chat-title">{title}</h3>
          {session?.pending && <span className="badge">Sedang menulis</span>}
        </div>
        <div className="mini-chat-actions">
          {canExpand && (
            <button
              type="button"
              className="mini-chat-icon-btn"
              onClick={onExpand}
              aria-label="Perluas ke halaman Chatbot"
              title="Perluas ke halaman Chatbot"
              disabled={!session?.id}
            >
              ⤢
            </button>
          )}
          <button
            type="button"
            className="mini-chat-icon-btn"
            onClick={onClose}
            aria-label="Tutup kartu chat"
            title="Tutup (Esc)"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mini-chat-body">
        <ChatThread
          session={session}
          messages={messages}
          streaming={streaming}
          streamingSentences={streamingSentences}
          droppedLive={droppedLive}
          busyNotice={busyNotice}
          error={error}
          onSend={onSend}
          autoFocus
        />
      </div>
    </section>
  );
}
