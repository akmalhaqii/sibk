// C4/C5: kelola sesi chat aktif, sinkronisasi snapshot recompute, streaming SSE, dan polling pending
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChatSession,
  getChatSession,
  patchChatSession,
  sendMessage,
} from '../api/chat.js';

export function useChatSession({ result = null, sessionId = null, enabled = true } = {}) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingSentences, setStreamingSentences] = useState([]);
  const [droppedLive, setDroppedLive] = useState(0);
  const [busyNotice, setBusyNotice] = useState(null);
  const [error, setError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const sessionRef = useRef(null);
  const abortRef = useRef(null);
  sessionRef.current = session;

  const applySession = useCallback((s) => {
    setSession(s);
    setMessages(Array.isArray(s?.messages) ? s.messages : []);
  }, []);

  const reload = useCallback(
    async (idOverride = null) => {
      const targetId = idOverride || sessionRef.current?.id;
      if (!targetId) return null;
      const fresh = await getChatSession(targetId);
      applySession(fresh);
      return fresh;
    },
    [applySession]
  );

  // Mode C5: buka sesi berdasarkan sessionId dari URL
  useEffect(() => {
    if (!enabled || !sessionId || result) return;
    let cancelled = false;
    setLoadingSession(true);
    setError(null);
    getChatSession(sessionId)
      .then((s) => {
        if (!cancelled) applySession(s);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId, result, applySession]);

  // Mode C4: buat atau pakai ulang sesi dari result; bila snapshot berubah (recompute), kirim PATCH
  useEffect(() => {
    if (!enabled || !result || sessionId) return;
    let cancelled = false;
    const current = sessionRef.current;
    const resultFileId = result?.entity?.file_id ?? null;
    const currentFileId = current?.analysis?.file_id ?? null;

    const run = async () => {
      setError(null);
      if (current && current.mode === 'analysis' && currentFileId === resultFileId) {
        // Hindari PATCH berulang bila referensi result sama persis
        if (current.snapshot === result) return;
        const updated = await patchChatSession(current.id, { result });
        if (!cancelled) applySession(updated);
      } else {
        setLoadingSession(true);
        const created = await createChatSession({ result, origin: 'analysis' });
        if (!cancelled) {
          // Simpan snapshot referensi agar recompute berikutnya mendeteksi perubahan
          applySession({ ...created, snapshot: result });
        }
      }
    };

    run()
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, result, sessionId, applySession]);

  // Polling 2 detik saat session.pending = true (mis. sesudah user klik Perluas ⤢ di tengah streaming)
  useEffect(() => {
    if (!enabled || !session?.id || !session?.pending || streaming) return;
    const timer = setInterval(() => {
      getChatSession(session.id)
        .then((fresh) => {
          applySession(fresh);
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(timer);
  }, [enabled, session?.id, session?.pending, streaming, applySession]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (rawText, { onBusyRestore } = {}) => {
      const content = String(rawText ?? '').trim();
      const current = sessionRef.current;
      if (!content || !current?.id || streaming || current.pending) return false;

      const tempUserId = `tmp_user_${Date.now()}`;
      const optimisticUser = {
        id: tempUserId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };

      setBusyNotice(null);
      setError(null);
      setStreaming(true);
      setStreamingSentences([]);
      setDroppedLive(0);
      setMessages((prev) => [...prev, optimisticUser]);

      const controller = new AbortController();
      abortRef.current = controller;

      let gotBusy = false;
      let gotDone = false;

      try {
        await sendMessage(current.id, content, {
          signal: controller.signal,
          onEvent: (event, data) => {
            if (event === 'meta' && data?.message_id) {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempUserId ? { ...m, id: data.message_id } : m))
              );
            } else if (event === 'sentence' && data?.text) {
              setStreamingSentences((prev) => [...prev, data.text]);
            } else if (event === 'dropped' && Number.isFinite(data?.count)) {
              setDroppedLive(data.count);
            } else if (event === 'busy') {
              gotBusy = true;
              setMessages((prev) => prev.filter((m) => m.id !== tempUserId));
              setStreamingSentences([]);
              setBusyNotice('Asisten sedang menjawab pertanyaan lain, coba lagi sebentar.');
              onBusyRestore?.(content);
            } else if (event === 'done' && data?.message) {
              gotDone = true;
              setStreamingSentences([]);
              setDroppedLive(0);
              setMessages((prev) => [...prev, data.message]);
              // Muat ulang judul bila ini pertanyaan pertama
              reload(current.id).catch(() => {});
            } else if (event === 'error') {
              setError(data?.error || 'Terjadi kesalahan saat menjawab.');
            }
          },
        });
        if (!gotBusy && !gotDone) {
          await reload(current.id).catch(() => {});
        }
        return !gotBusy;
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Gagal mengirim pesan.');
          await reload(current.id).catch(() => {});
        }
        return false;
      } finally {
        setStreaming(false);
        setStreamingSentences([]);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [streaming, reload]
  );

  return {
    session,
    messages,
    loadingSession,
    streaming,
    streamingSentences,
    droppedLive,
    busyNotice,
    error,
    send,
    reload,
    applySession,
  };
}
