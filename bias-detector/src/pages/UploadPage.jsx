// pages/UploadPage.jsx — Phase 2: Real API Integration
// Uploads the CSV to FastAPI backend, shows real loading steps,
// then navigates to /results passing the actual bias data via Router state.

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, X, CheckCircle2,
  Sparkles, AlertCircle, CloudUpload, ServerCrash
} from 'lucide-react';
import { API_URL } from '../config';

// These steps animate while the real API call runs.
// Each appears ~every 800ms to match typical Gemini + bias computation time.
const LOADING_STEPS = [
  { text: 'Reading CSV structure...', icon: '📄' },
  { text: 'Calculating Demographic Parity...', icon: '⚖️' },
  { text: 'Running Disparate Impact test...', icon: '📊' },
  { text: 'Scanning for proxy variables...', icon: '🔍' },
  { text: 'Generating Gemini explanation...', icon: '✨' },
];

export default function UploadPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  // ── FILE VALIDATION ─────────────────────────────────────────────
  function validateFile(f) {
    if (!f) return 'No file selected.';
    if (!f.name.toLowerCase().endsWith('.csv')) return 'Only .csv files are supported.';
    if (f.size > 50 * 1024 * 1024) return 'File is too large. Maximum size is 50MB.';
    if (f.size === 0) return 'The file appears to be empty.';
    return null;
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);
  }

  // ── DRAG AND DROP ───────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);
  }, []);

  // ── REAL API CALL ───────────────────────────────────────────────
  // Phase 2 core: POSTs the CSV to /analyze and navigates to /results
  // with the real bias metrics in router state.
  async function handleAnalyze() {
    if (!file) { setError('Please upload a CSV file first.'); return; }

    setIsLoading(true);
    setLoadingStep(0);
    setError('');

    // Animate loading steps every 800ms while the API call runs
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const next = prev + 1;
        // Stop at second-to-last step — we'll advance to "done" on success
        if (next >= LOADING_STEPS.length - 1) clearInterval(interval);
        return Math.min(next, LOADING_STEPS.length - 1);
      });
    }, 800);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type — browser sets it automatically with boundary for multipart
      });

      if (!response.ok) {
        // FastAPI sends errors as { detail: "..." }
        let errMsg = `Server error: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const results = await response.json();

      clearInterval(interval);
      setLoadingStep(LOADING_STEPS.length - 1); // Show final step

      // Small delay so user sees the final step, then navigate with data
      setTimeout(() => {
        navigate('/results', {
          state: {
            results,          // The full bias analysis JSON from backend
            fileName: file.name,
          },
        });
      }, 500);

    } catch (err) {
      clearInterval(interval);
      setIsLoading(false);

      // Distinguish network errors from server errors
      if (err.message === 'Failed to fetch') {
        setError(
          `Cannot connect to analysis server. Make sure the backend is running:\n` +
          `uvicorn main:app --reload (on port 8000)`
        );
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-6">
      <div className="max-w-2xl mx-auto">

        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-4">
            <CloudUpload size={32} className="text-google-blue" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Dataset</h1>
          <p className="text-gray-500">
            CSV files from ATS exports, HR systems, or custom hiring data — all supported.
          </p>
        </div>

        {/* Upload Card */}
        <div className="card p-8">

          {/* Drop Zone */}
          <div
            onClick={() => !file && fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-10 text-center
              transition-all duration-300
              ${file
                ? 'border-google-green bg-green-50/50 cursor-default'
                : isDragging
                  ? 'drop-zone-active cursor-copy'
                  : 'border-gray-200 bg-gray-50/50 hover:border-google-blue hover:bg-blue-50/30 cursor-pointer'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="animate-fade-in">
                <CheckCircle2 size={48} className="mx-auto text-google-green mb-3" />
                <p className="font-semibold text-gray-900 mb-1">{file.name}</p>
                <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-google-red transition-colors"
                >
                  <X size={14} /> Remove file
                </button>
              </div>
            ) : (
              <div>
                <Upload
                  size={40}
                  className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-google-blue' : 'text-gray-300'}`}
                />
                <p className="font-medium text-gray-600 mb-1">
                  {isDragging ? 'Drop it!' : 'Drop your CSV here'}
                </p>
                <p className="text-sm text-gray-400 mb-4">or click to browse files</p>
                <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white border border-gray-100 rounded-full px-3 py-1.5">
                  <FileText size={12} />
                  .csv files · max 50MB
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-google-red">
              <ServerCrash size={16} className="flex-shrink-0 mt-0.5" />
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          {/* What we check */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { label: 'Gender Bias', color: 'text-google-blue', bg: 'bg-blue-50' },
              { label: 'Income Bias', color: 'text-google-red', bg: 'bg-red-50' },
              { label: 'Proxy Vars', color: 'text-google-green', bg: 'bg-green-50' },
            ].map(({ label, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                <p className={`text-xs font-semibold ${color}`}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Analyzed</p>
              </div>
            ))}
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || isLoading}
            className={`
              w-full mt-6 py-4 rounded-2xl font-semibold text-base
              flex items-center justify-center gap-2.5
              transition-all duration-200
              ${file && !isLoading
                ? 'bg-google-blue text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100 active:scale-[0.99]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Sparkles size={20} />
            Analyze with Gemini
          </button>

          <p className="text-center text-xs text-gray-400 mt-3">
            Your data is sent only to your local backend server and is never stored externally.
          </p>
        </div>

        {/* Required columns guide */}
        <div className="mt-6 card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Required CSV columns</h3>
          <p className="text-xs text-gray-400 mb-3">Your file must include at minimum:</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {['Gender', 'Hired'].map(col => (
              <code key={col} className="text-xs bg-blue-50 text-google-blue px-2 py-1 rounded-md font-mono border border-blue-100">
                {col} (required)
              </code>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1 mt-3">Optional columns</h3>
          <div className="flex flex-wrap gap-2">
            {['Income', 'Zip_Code', 'Age', 'Experience_Years'].map(col => (
              <code key={col} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                {col}
              </code>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-google-blue font-medium mb-1">Gender column accepted values:</p>
            <p className="text-xs text-gray-500">m, f, M, F, male, female, man, woman, 0, 1, true, false</p>
          </div>
          <div className="mt-2 p-3 bg-green-50 rounded-xl">
            <p className="text-xs text-google-green font-medium mb-1">Hired column accepted values:</p>
            <p className="text-xs text-gray-500">0, 1, yes, no, y, n, true, false</p>
          </div>
        </div>
      </div>

      {/* ── LOADING OVERLAY ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">

          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse-ring"></div>
            <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-google-blue animate-spin-slow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={24} className="text-google-blue" />
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gemini is analyzing...</h2>
          <p className="text-xs text-gray-400 mb-4">This may take 10–30 seconds depending on dataset size</p>

          <div className="h-8 flex items-center">
            {LOADING_STEPS[loadingStep] && (
              <p className="text-gray-500 animate-fade-in" key={loadingStep}>
                {LOADING_STEPS[loadingStep].icon} {LOADING_STEPS[loadingStep].text}
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i <= loadingStep ? 'bg-google-blue scale-110' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Powered by Gemini 2.5 Flash · Real bias computation running
          </p>
        </div>
      )}
    </div>
  );
}
