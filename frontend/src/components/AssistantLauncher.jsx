// C4: peluncur Asisten AI di bawah Ringkasan Eksekutif setelah ringkasan selesai
export default function AssistantLauncher({ tier = null, onOpen, onAskSample, disabled = false }) {
  const tierLabel = tier || 'saat ini';
  const samples = [
    `Kenapa tier-nya ${tierLabel}?`,
    'Apa itu liabilitas terhadap ekuitas?',
    'Kenapa nilai wajarnya bisa beda dengan situs lain?',
  ];

  return (
    <div className="assistant-launcher no-print">
      <button
        type="button"
        className="btn-assistant-launch"
        onClick={onOpen}
        disabled={disabled}
      >
        Tanyakan ke Asisten AI
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
    </div>
  );
}
