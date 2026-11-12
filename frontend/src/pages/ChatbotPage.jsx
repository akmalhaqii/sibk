// C5: halaman Chatbot penuh (/chatbot dan /chatbot/:sessionId)
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createChatSession,
  deleteChatSession,
  listChatSessions,
  patchChatSession,
} from '../api/chat.js';
import { useChatSession } from '../hooks/useChatSession.js';
import ChatThread from '../components/ChatThread.jsx';
import SessionSidebar from '../components/SessionSidebar.jsx';
import NewSessionDialog from '../components/NewSessionDialog.jsx';

export default function ChatbotPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const chat = useChatSession({
    sessionId: sessionId || null,
    enabled: Boolean(sessionId),
  });

  const refreshSessions = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listChatSessions();
      const rows = Array.isArray(list) ? list : [];
      setSessions(rows);
      return rows;
    } catch {
      return [];
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshSessions().then((rows) => {
      if (!sessionId && rows.length > 0) {
        navigate(`/chatbot/${rows[0].id}`, { replace: true });
      }
    });
  }, [sessionId, navigate, refreshSessions]);

  // Segarkan daftar sidebar saat judul / jumlah pesan berubah
  useEffect(() => {
    if (!chat.session?.id) return;
    refreshSessions();
  }, [chat.session?.id, chat.session?.title, chat.messages.length, chat.session?.pending, refreshSessions]);

  const handleBackToAnalysis = () => {
    if (!chat.session?.snapshot) return;
    navigate('/result', {
      state: {
        result: chat.session.snapshot,
        initialResult: chat.session.snapshot,
      },
    });
  };

  const handleRename = async (id, title) => {
    const updated = await patchChatSession(id, { title });
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)));
    if (id === chat.session?.id) {
      chat.applySession(updated);
    }
  };

  const handleDelete = async (id) => {
    await deleteChatSession(id);
    const remaining = await refreshSessions();
    if (id === sessionId) {
      if (remaining.length > 0) {
        navigate(`/chatbot/${remaining[0].id}`, { replace: true });
      } else {
        navigate('/chatbot', { replace: true });
      }
    }
  };

  const handleCreateSession = async (payload) => {
    const created = await createChatSession(payload);
    setDialogOpen(false);
    await refreshSessions();
    navigate(`/chatbot/${created.id}`);
  };

  const activeSession = sessionId ? chat.session : null;
  const activeTicker = activeSession?.analysis?.ticker || null;

  return (
    <div className="chatbot-page">
      <header className="chatbot-topbar">
        <div className="chatbot-topbar-left">
          {activeSession?.snapshot ? (
            <button type="button" className="btn-secondary" onClick={handleBackToAnalysis}>
              ← Kembali ke analisis
            </button>
          ) : (
            <Link to="/" className="back-link">
              ← Unggah Laporan Baru
            </Link>
          )}
          <h1 style={{ margin: 0, fontSize: 20 }}>Asisten AI TelusurFin</h1>
        </div>
      </header>

      <div className="chatbot-layout">
        <SessionSidebar
          sessions={sessions}
          activeId={sessionId || null}
          loading={loadingList}
          onSelect={(id) => navigate(`/chatbot/${id}`)}
          onNewClick={() => setDialogOpen(true)}
          onRename={handleRename}
          onDelete={handleDelete}
        />

        <main className="card chatbot-main">
          {sessionId && activeSession ? (
            <>
              <div className="chatbot-main-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 17,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activeSession.title || 'Sesi Chat'}
                  </h2>
                  <span className="badge">
                    {activeTicker || (activeSession.mode === 'glossary_only' ? 'Kamus saja' : 'Bebas')}
                  </span>
                </div>
                {activeSession.analysis?.period_end && (
                  <span className="meta-note">
                    {activeSession.analysis.period_type} · {activeSession.analysis.period_end}
                  </span>
                )}
              </div>

              <div className="chatbot-main-body">
                <ChatThread
                  session={activeSession}
                  messages={chat.messages}
                  streaming={chat.streaming}
                  streamingSentences={chat.streamingSentences}
                  droppedLive={chat.droppedLive}
                  busyNotice={chat.busyNotice}
                  error={chat.error}
                  onSend={chat.send}
                  autoFocus
                  emptyHint={
                    activeSession.mode === 'glossary_only'
                      ? 'Sesi kamus TelusurFin. Tanyakan arti rasio seperti ROE, DER, current ratio, atau nilai wajar Graham.'
                      : 'Tanyakan arti rasio, kondisi tier, atau angka pada laporan keuangan emiten ini.'
                  }
                />
              </div>
            </>
          ) : sessionId && chat.loadingSession ? (
            <p className="meta-note">Memuat sesi…</p>
          ) : sessionId && chat.error ? (
            <div>
              <div className="alert-error" role="alert">
                {chat.error}
              </div>
              <button type="button" className="btn-primary" onClick={() => setDialogOpen(true)}>
                + Buat Sesi Baru
              </button>
            </div>
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 360 }}>
              <p className="meta-note" style={{ marginBottom: 14 }}>
                Pilih sesi di sebelah kiri atau buat sesi baru untuk mulai bertanya.
              </p>
              <button type="button" className="btn-primary" onClick={() => setDialogOpen(true)}>
                + Sesi baru
              </button>
            </div>
          )}
        </main>
      </div>

      <NewSessionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateSession}
      />
    </div>
  );
}
