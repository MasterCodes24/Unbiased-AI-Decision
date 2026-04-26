// UploadPage.jsx — Column Mapper Edition
// Phase 3 upgrade: PapaParse extracts headers immediately on file select,
// then shows a mapping step before enabling "Analyze".

import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, X, CheckCircle2, Sparkles, AlertCircle,
  CloudUpload, ServerCrash, ArrowRight, ChevronDown, MapPin,
  ShieldCheck, Target, BarChart3, RefreshCw
} from 'lucide-react';
import { API_URL } from "../config";

const LOADING_STEPS = [
  { text: 'Reading CSV structure...', icon: '📄' },
  { text: 'Applying column mapping...', icon: '🗺️' },
  { text: 'Calculating Demographic Parity...', icon: '⚖️' },
  { text: 'Running Disparate Impact test...', icon: '📊' },
  { text: 'Scanning for proxy variables...', icon: '🔍' },
  { text: 'Generating Gemini explanation...', icon: '✨' },
];

// ── PAPAPARSE (loaded via CDN in index.html or bundled) ──────────────
// We call window.Papa or import dynamically
async function parseCSVHeaders(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const firstLine = text.split('\n')[0] || '';
      // Handle quoted CSV headers
      const headers = firstLine.split(',').map(h =>
        h.trim().replace(/^["']|["']$/g, '')
      ).filter(Boolean);
      resolve(headers);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file.slice(0, 4096)); // Only read first 4KB for headers
  });
}

export default function UploadPage() {
  const navigate = useNavigate();

  const [file, setFile]               = useState(null);
  const [csvHeaders, setCsvHeaders]   = useState([]);
  const [isDragging, setIsDragging]   = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError]             = useState('');
  const [step, setStep]               = useState('upload'); // 'upload' | 'map' | 'ready'

  // Column mapping state
  const [protectedAttr, setProtectedAttr] = useState('');
  const [targetCol, setTargetCol]         = useState('');
  const [incomeCol, setIncomeCol]         = useState('');

  const fileInputRef = useRef(null);

  // ── FILE VALIDATION ───────────────────────────────────────────────
  function validateFile(f) {
    if (!f) return 'No file selected.';
    if (!f.name.toLowerCase().endsWith('.csv')) return 'Only .csv files are supported.';
    if (f.size > 50 * 1024 * 1024) return 'File is too large. Maximum 50MB.';
    if (f.size === 0) return 'The file appears to be empty.';
    return null;
  }

  async function processFile(f) {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError('');
    setFile(f);

    try {
      const headers = await parseCSVHeaders(f);
      setCsvHeaders(headers);

      // Auto-detect common column names
      const lower = headers.map(h => h.toLowerCase());
      const autoProtected = headers[lower.findIndex(h =>
        ['gender', 'sex', 'race', 'ethnicity', 'protected'].includes(h)
      )] || '';
      const autoTarget = headers[lower.findIndex(h =>
        ['hired', 'approved', 'decision', 'outcome', 'target', 'label'].includes(h)
      )] || '';
      const autoIncome = headers[lower.findIndex(h =>
        ['income', 'salary', 'socioeconomic', 'class'].includes(h)
      )] || '';

      setProtectedAttr(autoProtected);
      setTargetCol(autoTarget);
      setIncomeCol(autoIncome);
      setStep('map');
    } catch (e) {
      setError('Could not read CSV headers: ' + e.message);
    }
  }

  // ── DRAG & DROP ───────────────────────────────────────────────────
  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  function handleFileChange(e) { processFile(e.target.files[0]); }

  // ── MAPPING COMPLETE? ─────────────────────────────────────────────
  const mappingComplete = protectedAttr && targetCol;

  // ── REAL API CALL ─────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!file || !mappingComplete) {
      setError('Please complete the column mapping first.');
      return;
    }
    setIsLoading(true);
    setLoadingStep(0);
    setError('');

    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const next = prev + 1;
        if (next >= LOADING_STEPS.length - 1) clearInterval(interval);
        return Math.min(next, LOADING_STEPS.length - 1);
      });
    }, 900);

    try {
      const columnMap = JSON.stringify({
        protected_attr: protectedAttr,
        target_col: targetCol,
        income_col: incomeCol || null,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('column_map', columnMap);

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errMsg = `Server error: ${response.status}`;
        try { const d = await response.json(); errMsg = d.detail || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }

      const results = await response.json();
      clearInterval(interval);
      setLoadingStep(LOADING_STEPS.length - 1);

      setTimeout(() => {
        navigate('/results', {
          state: { results, fileName: file.name, columnMap: { protectedAttr, targetCol, incomeCol } },
        });
      }, 500);

    } catch (err) {
      clearInterval(interval);
      setIsLoading(false);
      if (err.message === 'Failed to fetch') {
        setError('Cannot connect to analysis server.\nMake sure backend is running:\n  uvicorn main:app --reload');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    }
  }

  function resetAll() {
    setFile(null); setCsvHeaders([]); setProtectedAttr(''); setTargetCol('');
    setIncomeCol(''); setStep('upload'); setError('');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }

  // ── RENDER ────────────────────────────────────────────────────────
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
            CSV files from any HR system, ATS export, or custom dataset — all supported.
          </p>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-3 mt-6">
            {['Upload CSV', 'Map Columns', 'Analyze'].map((s, i) => {
              const active = (step === 'upload' && i === 0)
                || (step === 'map' && i === 1)
                || (step === 'ready' && i === 2);
              const done   = (step === 'map' && i === 0)
                || (step === 'ready' && i <= 1);
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${done   ? 'bg-google-green text-white'
                    : active ? 'bg-google-blue text-white ring-4 ring-blue-100'
                    :          'bg-gray-100 text-gray-400'}`}>
                    {done ? <CheckCircle2 size={14}/> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-google-blue' : done ? 'text-google-green' : 'text-gray-400'}`}>
                    {s}
                  </span>
                  {i < 2 && <div className={`w-8 h-0.5 ${done ? 'bg-google-green' : 'bg-gray-200'}`}/>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── STEP 1: DROP ZONE ───────────────────────────────────── */}
        {step === 'upload' && (
          <div className="card p-8">
            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
                transition-all duration-300
                ${isDragging
                  ? 'drop-zone-active'
                  : 'border-gray-200 bg-gray-50/50 hover:border-google-blue hover:bg-blue-50/30'}
              `}
            >
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden"/>
              <Upload size={40} className={`mx-auto mb-4 transition-colors ${isDragging ? 'text-google-blue' : 'text-gray-300'}`}/>
              <p className="font-medium text-gray-600 mb-1">{isDragging ? 'Drop it!' : 'Drop your CSV here'}</p>
              <p className="text-sm text-gray-400 mb-4">or click to browse</p>
              <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white border border-gray-100 rounded-full px-3 py-1.5">
                <FileText size={12}/> .csv files · max 50MB
              </div>
            </div>
            {error && <ErrorBanner message={error}/>}

            <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-gray-600 leading-relaxed">
              <p className="font-semibold text-google-blue mb-1">✨ New: Flexible Column Mapper</p>
              Your CSV can use <em>any</em> column names — Gender, Sex, Race, Decision, Approved…
              After upload you'll map each column to its role. No renaming required.
            </div>
          </div>
        )}

        {/* ── STEP 2: COLUMN MAPPER ─────────────────────────────── */}
        {step === 'map' && (
          <div className="card p-8 animate-slide-up">
            {/* File chip */}
            <div className="flex items-center justify-between mb-6 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-google-green"/>
                <span className="text-sm font-medium text-gray-700">{file?.name}</span>
                <span className="text-xs text-gray-400">· {formatSize(file?.size || 0)}</span>
              </div>
              <button onClick={resetAll} className="text-xs text-gray-400 hover:text-google-red flex items-center gap-1">
                <X size={12}/> Change
              </button>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Map Your Columns</h2>
            <p className="text-sm text-gray-500 mb-6">
              Tell FairLens which columns to analyse. We detected <strong>{csvHeaders.length}</strong> columns.
            </p>

            {/* Detected columns preview chips */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {csvHeaders.map(h => (
                <span key={h} className={`text-xs px-2.5 py-1 rounded-full font-mono border
                  ${h === protectedAttr ? 'bg-blue-50 border-blue-200 text-google-blue'
                  : h === targetCol    ? 'bg-green-50 border-green-200 text-google-green'
                  : h === incomeCol    ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                  :                     'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {h}
                </span>
              ))}
            </div>

            <div className="space-y-4">

              {/* Protected Attribute */}
              <MappingRow
                icon={<ShieldCheck size={16}/>}
                iconBg="bg-blue-50 text-google-blue"
                label="Protected Attribute"
                sublabel="The sensitive column to audit for bias (e.g. Gender, Race)"
                required
                value={protectedAttr}
                headers={csvHeaders}
                onChange={setProtectedAttr}
              />

              {/* Target Outcome */}
              <MappingRow
                icon={<Target size={16}/>}
                iconBg="bg-green-50 text-google-green"
                label="Target / Outcome Column"
                sublabel="The decision variable (e.g. Hired, Approved, Decision)"
                required
                value={targetCol}
                headers={csvHeaders}
                onChange={setTargetCol}
              />

              {/* Income / Secondary (optional) */}
              <MappingRow
                icon={<BarChart3 size={16}/>}
                iconBg="bg-yellow-50 text-yellow-600"
                label="Socioeconomic Column"
                sublabel="Optional: Income, Class, SES — for Disparate Impact analysis"
                value={incomeCol}
                headers={['— Skip —', ...csvHeaders]}
                onChange={(v) => setIncomeCol(v === '— Skip —' ? '' : v)}
              />
            </div>

            {error && <ErrorBanner message={error} className="mt-4"/>}

            {/* Mapping summary */}
            {mappingComplete && (
              <div className="mt-5 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 font-mono leading-relaxed animate-fade-in">
                <span className="text-google-blue font-semibold">{protectedAttr}</span>
                {' → Protected Attribute   '}
                <span className="text-google-green font-semibold">{targetCol}</span>
                {' → Outcome'}
                {incomeCol && <><br/><span className="text-yellow-600 font-semibold">{incomeCol}</span>{' → Socioeconomic'}</>}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={resetAll} className="google-btn-secondary text-sm flex-shrink-0">
                <RefreshCw size={14}/> Reset
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!mappingComplete || isLoading}
                className={`flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2
                  transition-all duration-200
                  ${mappingComplete
                    ? 'bg-google-blue text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                <Sparkles size={18}/>
                {mappingComplete
                  ? `Analyze with Gemini →`
                  : 'Select required columns above'}
              </button>
            </div>
          </div>
        )}

        {/* ── ACCEPTED VALUES GUIDE (always visible below the card) ── */}
        <div className="mt-6 card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Accepted Values Guide</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="font-semibold text-google-blue mb-1">Protected Attribute</p>
              <p className="text-gray-500">m, f, M, F, male, female, 0, 1, true, false, white, non-white, majority, minority…</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <p className="font-semibold text-google-green mb-1">Target / Outcome</p>
              <p className="text-gray-500">0/1, yes/no, true/false, hired/not hired, approved/rejected, pass/fail…</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-xl">
              <p className="font-semibold text-yellow-600 mb-1">Socioeconomic (optional)</p>
              <p className="text-gray-500">high/low, 0/1, majority/minority…</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <p className="font-semibold text-gray-500 mb-1">Any Other Columns</p>
              <p className="text-gray-400">Numeric columns are auto-scanned for proxy bias (|r| &gt; 0.3).</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── LOADING OVERLAY ───────────────────────────────────────── */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-pulse-ring"/>
            <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-google-blue animate-spin-slow"/>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={24} className="text-google-blue"/>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gemini is analyzing…</h2>
          <p className="text-xs text-gray-400 mb-4">10–30 seconds depending on dataset size</p>
          <div className="h-8 flex items-center">
            {LOADING_STEPS[loadingStep] && (
              <p className="text-gray-500 animate-fade-in" key={loadingStep}>
                {LOADING_STEPS[loadingStep].icon} {LOADING_STEPS[loadingStep].text}
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-6">
            {LOADING_STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300
                ${i <= loadingStep ? 'bg-google-blue scale-110' : 'bg-gray-200'}`}/>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAPPING ROW ────────────────────────────────────────────────────
function MappingRow({ icon, iconBg, label, sublabel, required, value, headers, onChange }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50/80 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          {required && <span className="text-xs text-google-red font-medium">Required</span>}
        </div>
        <p className="text-xs text-gray-400 mb-2">{sublabel}</p>
        <div className="relative">
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className={`w-full appearance-none rounded-lg border text-sm px-3 py-2 pr-8 bg-white
              focus:outline-none focus:ring-2 focus:ring-google-blue/30 transition-all
              ${value ? 'border-gray-200 text-gray-800' : 'border-dashed border-gray-300 text-gray-400'}`}
          >
            <option value="">— Select column —</option>
            {headers.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
        </div>
      </div>
    </div>
  );
}

// ── ERROR BANNER ───────────────────────────────────────────────────
function ErrorBanner({ message, className = '' }) {
  return (
    <div className={`flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-google-red ${className}`}>
      <ServerCrash size={16} className="flex-shrink-0 mt-0.5"/>
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}
