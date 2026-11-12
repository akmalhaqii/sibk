// C5: sidebar riwayat sesi dikelompokkan berdasarkan waktu + rename inline + konfirmasi hapus di halaman
import { useState } from 'react';

const GROUP_ORDER = ['Hari ini', 'Kemarin', '7 hari terakhir', 'Lebih lama'];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function classifyDateGroup(isoString, now = new Date()) {
  const ts = Date.parse(isoString || '');
  if (!Number.isFinite(ts)) return 'Lebih lama';
  const todayStart = startOfDay(now);
  const targetStart = startOfDay(new Date(ts));
  const diffDays = Math.round((todayStart - targetStart) / 86400000);
  if (diffDays <= 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  if (diffDays <= 7) return '7 hari terakhir';
  return 'Lebih lama';
}

export default function SessionSidebar({
  sessions = [],
  activeId = null,
  loading = false,
  onSelect,
  onNewClick,
  onRename,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const grouped = new Map(GROUP_ORDER.map((g) => [g, []]));
  const now = new Date();
  for (const s of sessions) {
    const g = classifyDateGroup(s.updated_at || s.created_at, now);
    grouped.get(g).push(s);
  }

  const startRename = (session) => {
    setConfirmDeleteId(null);
    setEditingId(session.id);
    setEditTitle(session.title || '');
  };

  const submitRename = async (e, id) => {
    e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed || !onRename) return;
    setBusyId(id);
    try {
      await onRename(id, trimmed);
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (id) => {
    if (!onDelete) return;
    setBusyId(id);
    try {
      await onDelete(id);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <aside className="card session-sidebar" aria-label="Riwayat Sesi Chat">
      <div className="session-sidebar-head">
        <h2 style={{ margin: 0, fontSize: 16 }}>Riwayat Sesi</h2>
        <button type="button" className="btn-primary" style={{ padding: '6px 11px', fontSize: 12.5 }} onClick={onNewClick}>
          + Sesi baru
        </button>
      </div>

      {loading && sessions.length === 0 && (
        <p className="meta-note">Memuat daftar sesi…</p>
      )}

      {!loading && sessions.length === 0 && (
        <p className="meta-note">Belum ada sesi. Klik “+ Sesi baru” untuk mulai.</p>
      )}

      <div className="session-sidebar-groups">
        {GROUP_ORDER.map((groupName) => {
          const items = grouped.get(groupName);
          if (!items || items.length === 0) return null;
          return (
            <div key={groupName}>
              <h3 className="session-group-label">{groupName}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((s) => {
                  const isActive = s.id === activeId;
                  const sub = [
                    s.analysis?.ticker || (s.mode === 'glossary_only' ? 'Kamus' : 'Bebas'),
                    s.pending ? 'Menulis…' : `${s.message_count ?? 0} pesan`,
                  ].join(' · ');

                  return (
                    <div
                      key={s.id}
                      className={`session-item ${isActive ? 'session-item-active' : ''}`}
                    >
                      <div className="session-item-main">
                        <button
                          type="button"
                          className="session-item-btn"
                          onClick={() => onSelect?.(s.id)}
                        >
                          <span className="session-item-title">{s.title || 'Sesi tanpa judul'}</span>
                          <span className="session-item-sub">{sub}</span>
                        </button>
                        <div className="session-item-actions">
                          <button
                            type="button"
                            className="session-action-btn"
                            aria-label="Ganti nama sesi"
                            title="Ganti nama"
                            onClick={() => startRename(s)}
                            disabled={busyId === s.id}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="session-action-btn"
                            aria-label="Hapus sesi"
                            title="Hapus sesi"
                            onClick={() => {
                              setEditingId(null);
                              setConfirmDeleteId(confirmDeleteId === s.id ? null : s.id);
                            }}
                            disabled={busyId === s.id}
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {editingId === s.id && (
                        <form className="session-rename-row" onSubmit={(e) => submitRename(e, s.id)}>
                          <input
                            type="text"
                            className="session-rename-input"
                            value={editTitle}
                            maxLength={80}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            aria-label="Judul baru sesi"
                          />
                          <button
                            type="submit"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11.5 }}
                            disabled={busyId === s.id || !editTitle.trim()}
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11.5 }}
                            onClick={() => setEditingId(null)}
                          >
                            Batal
                          </button>
                        </form>
                      )}

                      {confirmDeleteId === s.id && (
                        <div className="session-delete-confirm">
                          <span style={{ flex: 1 }}>Hapus sesi ini?</span>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: 11.5,
                              borderColor: '#fecaca',
                              color: '#b91c1c',
                              background: '#ffffff',
                            }}
                            onClick={() => confirmDelete(s.id)}
                            disabled={busyId === s.id}
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: 11.5 }}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
