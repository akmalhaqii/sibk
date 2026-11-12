import { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useMatch } from 'react-router-dom';
import UploadPage from './pages/UploadPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import Disclaimer from './components/Disclaimer.jsx';
import Sidebar, { RESULT_SECTIONS } from './components/Sidebar.jsx';
import './styles/sidebar.css';

const SIDEBAR_STORAGE_KEY = 'telusurfin:sidebar_collapsed';
const RESULT_STORAGE_KEY = 'telusurfin:last_result';

function readSidebarPreference() {
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved != null) return saved === 'true';
  } catch {}
  return window.matchMedia('(max-width: 760px)').matches;
}

function hasResult(state) {
  if (state?.result || import.meta.env.VITE_USE_MOCK === 'true') return true;
  try {
    return Boolean(JSON.parse(sessionStorage.getItem(RESULT_STORAGE_KEY)));
  } catch {
    return false;
  }
}

export default function App() {
  const location = useLocation();
  const resultRoute = Boolean(useMatch('/result'));
  const showResultSections = resultRoute && hasResult(location.state);
  const requestedSection = location.hash === '#tier' ? 'rasio' : location.hash.slice(1);
  const activeSection = RESULT_SECTIONS.find(({ id }) => id === requestedSection)?.id ?? 'ringkasan';
  const [collapsed, setCollapsed] = useState(readSidebarPreference);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  useEffect(() => {
    if (!showResultSections) return;

    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.getElementById(`${activeSection}-heading`)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSection, showResultSections]);

  return (
    <div className={'app-shell' + (collapsed ? ' app-shell--collapsed' : '')}>
      <a className="app-skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>Lewati navigasi</a>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((previous) => !previous)}
        resultRoute={resultRoute}
        showResultSections={showResultSections}
        activeSection={activeSection}
      />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/result" element={<ResultPage activeSection={activeSection} />} />
        </Routes>
        <Disclaimer />
      </div>
    </div>
  );
}
