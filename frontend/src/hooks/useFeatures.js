// C4: baca saklar fitur dari GET /api/health sekali
import { useEffect, useState } from 'react';
import { getHealth } from '../api/client.js';

const DEFAULT_FEATURES = {
  chat: false,
  chat_page: false,
  chat_free_mode: false,
};

export function useFeatures() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [ollama, setOllama] = useState('unknown');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((res) => {
        if (cancelled) return;
        setFeatures({
          chat: Boolean(res?.features?.chat),
          chat_page: Boolean(res?.features?.chat_page),
          chat_free_mode: Boolean(res?.features?.chat_free_mode),
        });
        setOllama(res?.ollama || 'unknown');
      })
      .catch(() => {
        if (!cancelled) setFeatures(DEFAULT_FEATURES);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { features, ollama, loaded };
}
