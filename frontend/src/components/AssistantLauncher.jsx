// C4: peluncur Asisten AI di dasar kartu Ringkasan Eksekutif (prop footer NarrativePanel).
// Muncul setelah ringkasan pertama selesai, tetap tampil saat chat terbuka (keadaan aktif),
// dan nonaktif selama sesi disiapkan atau ringkasan sedang ditulis ulang.
export default function AssistantLauncher({ tier = null, active = false, onOpen, onAskSample, disabled = false, note = null }) {
  const tierLabel = tier || 'saat ini';
  const samples = [
    `Kenapa tier-nya ${tierLabel}?`,
    'Apa itu liabilitas terhadap ekuitas?',
    'Kenapa nilai wajarnya bisa beda dengan situs lain?',
  ];

  return (
    <div className={`assistant-launcher ${active ? 'assistant-launcher-active' : ''}`}>
      <button
        type="button"
        className="btn-assistant-launch"
        onClick={onOpen}
        disabled={disabled && !active}
        aria-pressed={active}
      >
        {active ? 'Asisten AI terbuka' : 'Tanyakan ke Asisten AI'}
      </button>
      <div className="assistant-sample-chips">
        {samples.map((q) => (
          <button
            key={q}
            type="button"
            className="assistant-sample-chip"
            onClick={() => onAskSample?.(q)}
            disabled={disabled}
          >
            {q}
          </button>
        ))}
      </div>
      {note && (
        <p className="assistant-launcher-note" role="status">
          {note}
        </p>
      )}
    </div>
  );
}
