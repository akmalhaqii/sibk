// FR-UI-03 / FR-UI-04 / FR-UI-02 (needs_review): metrik, tier, valuasi, narasi, tabel koreksi.
// R-11: simpan hasil ke sessionStorage supaya halaman tidak kosong saat di-refresh waktu demo.
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { recompute } from '../api/client.js';
import ValidationBadge from '../components/ValidationBadge.jsx';
import MetricCard from '../components/MetricCard.jsx';
import TierCard from '../components/TierCard.jsx';
import ValuationCard from '../components/ValuationCard.jsx';
import ExtractionTable from '../components/ExtractionTable.jsx';
import NarrativePanel from '../components/NarrativePanel.jsx';
import ReportActions from '../components/ReportActions.jsx';
import SummaryRow from '../components/SummaryRow.jsx';
import AssistantLauncher from '../components/AssistantLauncher.jsx';
import MiniChatCard from '../components/MiniChatCard.jsx';
import { useFeatures } from '../hooks/useFeatures.js';
import { useChatSession } from '../hooks/useChatSession.js';
import mockResult from '../mock/analyze.json';

const STORAGE_KEY = 'telusurfin:last_result';
const INITIAL_STORAGE_KEY = 'telusurfin:initial_result';
const SHARES_STORAGE_KEY = 'telusurfin:shares_input';

const METRIC_GROUPS = [
  {
    title: 'Profitabilitas',
    items: [
      { key: 'roe', label: 'ROE', annualizedQuarterly: true },
      { key: 'roa', label: 'ROA', annualizedQuarterly: true },
      { key: 'net_margin', label: 'Margin laba bersih', annualizedQuarterly: false },
      { key: 'operating_margin', label: 'Margin usaha', annualizedQuarterly: false },
    ],
  },
  {
    title: 'Likuiditas',
    items: [{ key: 'current_ratio', label: 'Current ratio', annualizedQuarterly: false }],
  },
  {
    title: 'Solvabilitas',
    items: [
      {
        key: 'der',
        label: 'Liabilitas/ekuitas',
        annualizedQuarterly: false,
        hint: 'Total liabilitas dibagi ekuitas. Bukan DER utang berbunga seperti di situs data saham, jadi nilainya bisa lebih tinggi.',
      },
      { key: 'liability_to_asset', label: 'Liabilitas/aset', annualizedQuarterly: false },
    ],
  },
  {
    title: 'Pertumbuhan dan arus kas',
    items: [
      { key: 'revenue_growth', label: 'Pertumbuhan pendapatan', annualizedQuarterly: false },
      { key: 'earnings_growth', label: 'Pertumbuhan laba', annualizedQuarterly: false },
      { key: 'cash_conversion', label: 'Konversi kas', annualizedQuarterly: false },
      { key: 'ocf_to_assets', label: 'Arus kas operasi/aset', annualizedQuarterly: true },
    ],
  },
];

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(() => {
    if (state?.result) return state.result;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return import.meta.env.VITE_USE_MOCK === 'true' ? mockResult : null;
  });

  const [initialResult, setInitialResult] = useState(() => {
    if (state?.initialResult) return state.initialResult;
    if (state?.result) return state.result;
    try {
      const savedInit = sessionStorage.getItem(INITIAL_STORAGE_KEY);
      if (savedInit) return JSON.parse(savedInit);
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return import.meta.env.VITE_USE_MOCK === 'true' ? mockResult : null;
  });

  const [sharesInput] = useState(() => {
    if (state?.sharesInput !== undefined) return state.sharesInput;
    try {
      const raw = sessionStorage.getItem(SHARES_STORAGE_KEY);
      if (raw != null && raw !== '') return Number(raw);
    } catch {}
    return null;
  });

  const [narrativeData, setNarrativeData] = useState(null); // FR-OUT-01
  const [narrativeFinished, setNarrativeFinished] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeError, setRecomputeError] = useState(null);

  const { features } = useFeatures();
  const chat = useChatSession({
    result,
    enabled: Boolean(features.chat && narrativeFinished && result),
  });

  useEffect(() => {
    setChatOpen(false);
  }, [result?.entity?.file_id]);

  useEffect(() => {
    if (!state?.result) return;
    setResult(state.result);
    setInitialResult(state.initialResult ?? state.result);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.result));
      sessionStorage.setItem(INITIAL_STORAGE_KEY, JSON.stringify(state.initialResult ?? state.result));
    } catch {}
    // REV-01: hapus state dari history agar refresh membaca sessionStorage
    navigate('.', { replace: true, state: null });
  }, [state?.result, state?.initialResult, navigate]);

  function saveResult(next) {
    setResult(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  async function handleRecomputeFields(nextFields) {
    if (!result) return;
    setRecomputing(true);
    setRecomputeError(null);
    try {
      const next = await recompute({
        entity: result.entity,
        fields: nextFields,
        ticker: result.entity.ticker,
        shares: sharesInput ?? null,
        market: result.market ?? null, // REV-02: pertahankan sumber & waktu harga
      });
      saveResult(next);
    } catch (err) {
      setRecomputeError(err.message);
    } finally {
      setRecomputing(false);
    }
  }

  async function handleApplyPrice(price) {
    if (!result) return;
    setRecomputing(true);
    setRecomputeError(null);
    try {
      const next = await recompute({
        entity: result.entity,
        fields: result.fields,
        ticker: result.entity.ticker,
        shares: sharesInput ?? null,
        price,
      });
      saveResult(next);
    } catch (err) {
      setRecomputeError(err.message);
    } finally {
      setRecomputing(false);
    }
  }

  async function handleResetFields() {
    if (!result || !initialResult) return;
    setRecomputing(true);
    setRecomputeError(null);
    try {
      const next = await recompute({
        entity: initialResult.entity,
        fields: structuredClone(initialResult.fields),
        ticker: initialResult.entity.ticker,
        shares: sharesInput ?? null,
        market: result.market ?? null, // REV-02: pertahankan sumber & waktu harga
      });
      saveResult(next);
    } catch (err) {
      setRecomputeError(err.message);
    } finally {
      setRecomputing(false);
    }
  }

  if (!result) {
    const showChatLauncher = Boolean(features.chat && narrativeFinished);

  function handleOpenChat() {
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isNarrow && features.chat_page && chat.session?.id) {
      navigate(`/chatbot/${chat.session.id}`);
      return;
    }
    setChatOpen(true);
  }

  function handleAskSample(questionText) {
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isNarrow && features.chat_page && chat.session?.id) {
      chat.send(questionText);
      navigate(`/chatbot/${chat.session.id}`);
      return;
    }
    setChatOpen(true);
    chat.send(questionText);
  }

  function handleExpandChat() {
    if (chat.session?.id) {
      navigate(`/chatbot/${chat.session.id}`);
    }
  }

  return (
      <main className="page-container empty-state card">
        <h1>Belum ada hasil analisis</h1>
        <p>Unggah laporan keuangan PDF terlebih dahulu untuk melihat hasil analisis.</p>
        <Link to="/" className="btn-primary">
          Kembali ke Halaman Unggah
        </Link>
      </main>
    );
  }

  const { entity, validation, metrics, tiering, market, valuation } = result;
  const isQuarterly = ['Q1', 'Q2', 'Q3', '9M', 'H1'].includes(entity?.period_type);

  const showChatLauncher = Boolean(features.chat && narrativeFinished);

  function handleOpenChat() {
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isNarrow && features.chat_page && chat.session?.id) {
      navigate(`/chatbot/${chat.session.id}`);
      return;
    }
    setChatOpen(true);
  }

  function handleAskSample(questionText) {
    const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isNarrow && features.chat_page && chat.session?.id) {
      chat.send(questionText);
      navigate(`/chatbot/${chat.session.id}`);
      return;
    }
    setChatOpen(true);
    chat.send(questionText);
  }

  function handleExpandChat() {
    if (chat.session?.id) {
      navigate(`/chatbot/${chat.session.id}`);
    }
  }

  return (
    <main className="page-container result-page">
      {/* Kepala Hasil */}
      <header className="result-header card">
        <div className="result-title-group">
          <div className="result-topline">
            <Link to="/" className="back-link no-print">
              ← Unggah Laporan Baru
            </Link>
            {entity?.file_url && (
              <a
                href={entity.file_url}
                target="_blank"
                rel="noreferrer"
                className="pdf-source-link no-print"
              >
                Buka PDF Sumber ↗
              </a>
            )}
          </div>

          <div className="entity-summary">
            <h1 className="ticker-heading">{entity?.ticker || 'EMITEN'}</h1>
            {entity?.period_type && <span className="period-badge">{entity.period_type}</span>}
            {entity?.period_end && <span className="meta-pill">Periode: {entity.period_end}</span>}
            {entity?.unit && <span className="meta-pill">Satuan: {entity.unit}</span>}
          </div>
        </div>

        <ValidationBadge validation={validation} />
      </header>

      {recomputeError && (
        <div className="alert-error" role="alert">
          {recomputeError}
        </div>
      )}

      {/* Ringkasan Narasi + Kartu Chat Mini (C4) */}
      <SummaryRow
        chatOpen={Boolean(features.chat && chatOpen)}
        summary={
          <>
            <NarrativePanel
              result={result}
              onLoaded={setNarrativeData}
              onFinished={setNarrativeFinished}
            />
            {showChatLauncher && !chatOpen && (
              <AssistantLauncher
                tier={tiering?.tier}
                onOpen={handleOpenChat}
                onAskSample={handleAskSample}
                disabled={chat.loadingSession}
              />
            )}
          </>
        }
        chatSlot={
          <MiniChatCard
            session={chat.session}
            messages={chat.messages}
            streaming={chat.streaming}
            streamingSentences={chat.streamingSentences}
            droppedLive={chat.droppedLive}
            busyNotice={chat.busyNotice}
            error={chat.error}
            onSend={chat.send}
            onClose={() => setChatOpen(false)}
            onExpand={handleExpandChat}
            canExpand={Boolean(features.chat_page)}
          />
        }
      />

      {/* Grid Dua Kolom: Metrik (Kiri) & Tier + Valuasi (Kanan) */}
      <div className="dashboard-grid">
        <section className="metrics-column card">
          <div className="section-header">
            <h2>Rasio Kesehatan Keuangan</h2>
            {isQuarterly && (
              <span className="meta-note">* Rasio berbasis laba/arus kas disetahunkan dari periode {entity.period_type}</span>
            )}
          </div>

          <div className="metric-groups">
            {METRIC_GROUPS.map((group) => (
              <div key={group.title} className="metric-group">
                <h3 className="metric-group-title">{group.title}</h3>
                <div className="metric-cards-grid">
                  {group.items.map((item) => (
                    <MetricCard
                      key={item.key}
                      label={item.label}
                      metric={metrics?.[item.key]}
                      annualized={item.annualizedQuarterly && isQuarterly}
                      hint={item.hint}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="side-column">
          <TierCard tiering={tiering} />
          <ValuationCard
            valuation={valuation}
            market={market}
            isQuarterly={isQuarterly}
            periodType={entity?.period_type}
            onApplyPrice={handleApplyPrice}
            loading={recomputing}
          />
        </div>
      </div>

      {/* FR-OUT-01: unduh laporan akhir */}
      <ReportActions result={result} narrative={narrativeData} />

      {/* Tabel Ekstraksi & Koreksi */}
      <ExtractionTable
        result={result}
        onRecompute={handleRecomputeFields}
        onReset={handleResetFields}
        loading={recomputing}
      />
    </main>
  );
}
