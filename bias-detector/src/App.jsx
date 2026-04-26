// App.jsx — The "traffic controller" of our entire app.
// React Router reads the URL and decides which page component to show.
// Think of it like a switch statement: "/" → LandingPage, etc.

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    // BrowserRouter: Wraps everything. Makes React "aware" of the browser URL.
    <BrowserRouter>
      {/* This outer div ensures the page is always at least full screen height */}
      <div className="min-h-screen bg-gray-50/50">
        
        {/* Navbar renders on EVERY page because it's outside <Routes> */}
        <Navbar />

        {/* Routes: Only ONE of these <Route> components renders at a time */}
        <Routes>
          {/* path="/" → Show LandingPage when URL is exactly "/" */}
          <Route path="/" element={<LandingPage />} />
          
          {/* path="/upload" → Show UploadPage when URL is "/upload" */}
          <Route path="/upload" element={<UploadPage />} />
          
          {/* path="/results" → Show ResultsPage when URL is "/results" */}
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}