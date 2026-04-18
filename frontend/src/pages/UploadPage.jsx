// UploadPage.jsx — The file upload page at URL: "/upload"
// The "Magic Trick": clicking Analyze shows a loading screen for 3 seconds,
// then automatically navigates to /results using React Router's useNavigate().

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // The hook that lets us change pages in code
import { 
  Upload, FileText, X, CheckCircle2, 
  Sparkles, AlertCircle, CloudUpload
} from 'lucide-react';

// The steps shown during the fake "analysis" loading screen.
// Each one appears for about 0.75 seconds, making it feel real.
const LOADING_STEPS = [
  { text: 'Reading CSV structure...', icon: '📄' },
  { text: 'Calculating Demographic Parity...', icon: '⚖️' },
  { text: 'Running Disparate Impact test...', icon: '📊' },
  { text: 'Scanning for proxy variables...', icon: '🔍' },
  { text: 'Generating Gemini explanation...', icon: '✨' },
];

export default function UploadPage() {
  // useNavigate() gives us a function to programmatically go to a different URL
  const navigate = useNavigate();

  // useState tracks data that changes over time and triggers a re-render
  const [file, setFile] = useState(null);         // The uploaded file object (or null)
  const [isDragging, setIsDragging] = useState(false); // Is something being dragged over the drop zone?
  const [isLoading, setIsLoading] = useState(false);    // Are we showing the loading screen?
  const [loadingStep, setLoadingStep] = useState(0);    // Which loading step text to show (0-4)
  const [error, setError] = useState('');              // Error message string (empty = no error)

  // useRef lets us access the hidden <input type="file"> element directly
  const fileInputRef = useRef(null);

  // ── FILE VALIDATION ──────────────────────────────────────────
  function validateFile(f) {
    if (!f) return 'No file selected.';
    if (!f.name.endsWith('.csv')) return 'Only .csv files are supported.';
    if (f.size > 50 * 1024 * 1024) return 'File is too large. Max size is 50MB.';
    return null; // null means "no error"
  }

  // ── HANDLE FILE SELECTION (from click) ──────────────────────
  function handleFileChange(e) {
    const f = e.target.files[0];
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);
  }

  // ── DRAG AND DROP HANDLERS ───────────────────────────────────
  // useCallback prevents these functions from being re-created on every render
  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Must call this to allow dropping
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); // Prevent browser from opening the file
    setIsDragging(false);
    const f = e.dataTransfer.files[0]; // Get the dropped file
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);
  }, []);

  // ── THE MAGIC TRICK: FAKE ANALYSIS ──────────────────────────
  // This function simulates a real API call using setTimeout.
  // After 3 seconds of showing loading steps, it redirects to /results.
  function handleAnalyze() {
    if (!file) { setError('Please upload a CSV file first.'); return; }
    
    setIsLoading(true); // Show the loading overlay
    setLoadingStep(0);  // Start at step 0

    // Show each loading step message with a 600ms interval
    // setInterval runs a function repeatedly at a set time gap
    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const next = prev + 1;
        if (next >= LOADING_STEPS.length) {
          clearInterval(interval); // Stop the interval when all steps shown
        }
        return next;
      });
    }, 600);

    // After exactly 3000ms (3 seconds), navigate to the results page
    // navigate('/results') is like clicking a link — changes the URL
    setTimeout(() => {
      clearInterval(interval);
      navigate('/results');
    }, 3000);
  }

  // ── FORMAT FILE SIZE ─────────────────────────────────────────
  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── RENDER ───────────────────────────────────────────────────
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
            We support CSV files from HR systems, ATS exports, and custom datasets.
          </p>
        </div>

        {/* Upload Card */}
        <div className="card p-8">
          
          {/* Drop Zone */}
          {/* The onClick on the div triggers the hidden file input */}
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
            {/* Hidden real file input — triggered by clicking the drop zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden" // 'hidden' means display:none — it's there but invisible
            />

            {/* Content changes based on whether a file has been selected */}
            {file ? (
              // FILE SELECTED STATE
              <div className="animate-fade-in">
                <CheckCircle2 size={48} className="mx-auto text-google-green mb-3" />
                <p className="font-semibold text-gray-900 mb-1">{file.name}</p>
                <p className="text-sm text-gray-400">{formatSize(file.size)}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-400 
                             hover:text-google-red transition-colors"
                >
                  <X size={14} /> Remove file
                </button>
              </div>
            ) : (
              // EMPTY STATE
              <div>
                <Upload 
                  size={40} 
                  className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-google-blue' : 'text-gray-300'}`} 
                />
                <p className="font-medium text-gray-600 mb-1">
                  {isDragging ? 'Drop it!' : 'Drop your CSV here'}
                </p>
                <p className="text-sm text-gray-400 mb-4">or click to browse files</p>
                <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 
                                bg-white border border-gray-100 rounded-full px-3 py-1.5">
                  <FileText size={12} />
                  .csv files · max 50MB
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {/* Only renders when 'error' is not an empty string */}
          {error && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 
                            border border-red-100 rounded-xl text-sm text-google-red">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* What we check — info panel */}
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
            disabled={!file}
            className={`
              w-full mt-6 py-4 rounded-2xl font-semibold text-base
              flex items-center justify-center gap-2.5
              transition-all duration-200
              ${file 
                ? 'bg-google-blue text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100 active:scale-[0.99]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Sparkles size={20} />
            Analyze with Gemini
          </button>

          {/* Small disclaimer below button */}
          <p className="text-center text-xs text-gray-400 mt-3">
            Your data is processed locally and never stored on our servers.
          </p>
        </div>

        {/* Required columns guide */}
        <div className="mt-6 card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Expected CSV columns</h3>
          <div className="flex flex-wrap gap-2">
            {['gender', 'income_bracket', 'hired', 'zip_code', 'college_name', 'experience_years'].map(col => (
              <code key={col} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                {col}
              </code>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Don't have a dataset? <a href="#" className="text-google-blue hover:underline">Download our sample CSV</a> to test the tool.
          </p>
        </div>
      </div>

      {/* ── LOADING OVERLAY ───────────────────────────────────────── */}
      {/* This only renders (appears) when isLoading is true */}
      {/* 'fixed inset-0' means it covers the ENTIRE screen */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 
                        flex flex-col items-center justify-center animate-fade-in">
          
          {/* The animated spinner — made from CSS borders */}
          <div className="relative mb-8">
            {/* Outer pulsing ring */}
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse-ring"></div>
            {/* Inner spinning ring */}
            <div className="w-20 h-20 rounded-full border-4 border-blue-100 
                            border-t-google-blue animate-spin-slow"></div>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={24} className="text-google-blue" />
            </div>
          </div>

          {/* Loading text */}
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gemini is analyzing...</h2>

          {/* Step indicator — shows current step text */}
          <div className="h-8 flex items-center">
            {/* '?' = conditional render. Only shows if that step index exists */}
            {LOADING_STEPS[loadingStep] && (
              <p className="text-gray-500 animate-fade-in" key={loadingStep}>
                {LOADING_STEPS[loadingStep].icon} {LOADING_STEPS[loadingStep].text}
              </p>
            )}
          </div>

          {/* Progress dots */}
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
            Powered by Gemini 1.5 Flash · Typical analysis: 15–30 seconds
          </p>
        </div>
      )}
    </div>
  );
}
