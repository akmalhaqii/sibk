import { Routes, Route, Link } from 'react-router-dom';
import UploadPage from './pages/UploadPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import ChatbotPage from './pages/ChatbotPage.jsx';
import Disclaimer from './components/Disclaimer.jsx';
import { useFeatures } from './hooks/useFeatures.js';

function ChatbotRouteGuard() {
  const { features, loaded } = useFeatures();
  if (!loaded) {
    return (
      <div className="container">
        <p className="meta-note">Memuat…</p>
      </div>
    );
  }
  if (!features.chat_page) {
    return (
      <div className="container">
        <div className="card">
          <p className="meta-note">Halaman Chatbot sedang dinonaktifkan.</p>
          <Link to="/" className="back-link">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }
  return <ChatbotPage />;
}

// Loading ditampilkan di UploadPage (AnalyzingOverlay), lalu pindah ke /result.
// Halaman /chatbot dan /chatbot/:sessionId aktif bila features.chat_page = true.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/chatbot" element={<ChatbotRouteGuard />} />
        <Route path="/chatbot/:sessionId" element={<ChatbotRouteGuard />} />
      </Routes>
      <Disclaimer />
    </>
  );
}
