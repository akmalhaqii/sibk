import { Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import Disclaimer from './components/Disclaimer.jsx';

// Dua halaman saja: API /analyze sinkron, jadi tidak ada status tahap nyata untuk dipantau.
// Loading ditampilkan di UploadPage (AnalyzingOverlay), lalu pindah ke /result.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
      <Disclaimer />
    </>
  );
}
