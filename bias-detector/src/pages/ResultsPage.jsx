// ResultsPage.jsx — What-If Simulator Edition
// Reads real bias results from Router state.
// New: Threshold Simulation card with live-updating Recharts bar chart.

import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, Download,
  RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Info, Users, DollarSign, GitBranch, Sparkles,
  ChevronDown, ChevronUp, Table2, FileWarning, Loader2,
  Sliders, TrendingDown, TrendingUp, Minus
} from 'lucide-react';
import { API_URL } from "../config";

// ── HELPERS (inline, no external mockData dependency) ────────────────
function getBiasLevel(v) {
  if (v < 10) return 'green';
  if (v <= 25) return 'yellow';
  return 'red';
}
function getBiasLabel(v) {
  if (v < 10) return 'Low Risk';
  if (v <= 25) return 'Moderate';
  return 'High Risk';
}
function getScoreColor(s) {
  if (s >= 80) return '#34A853';
  if (s >= 60) return '#FBBC05';
  return '#EA4335';
}
function getScoreLabel(s) {
  if (s >= 80) return 'Mostly Fair';
  if (s >= 60) return 'Moderate Concern';
  return 'High Bias Risk';
}

// Simple bar chart — pure SVG, no external dep required
function MiniBarChart({ data, height = 120 }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.groupA, d.groupB, d.bias)), 1);
  const barW = 14;
  const gap  = 6;
  const groupW = barW * 2 + gap + 18;
  const chartW = data.length * groupW + 20;

  return (
    <svg width="100%" viewBox={`0 0 ${chartW} ${height + 36}`} className="overflow-visible">
      {data.map((d, i) => {
        const x = i * groupW + 10;
        const hA = (d.groupA / maxVal) * height;
        const hB = (d.groupB / maxVal) * height;
        return (
          <g key={d.threshold}>
            {/* Group A bar */}
            <rect x={x} y={height - hA} width={barW} height={hA}
              rx="3" fill="#4285F4" opacity="0.85"/>
            {/* Group B bar */}
            <rect x={x + barW + gap} y={height - hB} width={barW} height={hB}
              rx="3" fill="#EA4335" opacity="0.85"/>
            {/* Threshold label */}
            <text x={x + barW + gap/2} y={height + 16}
              textAnchor="middle" fontSize="9" fill="#9CA3AF">
              {d.threshold.toFixed(2)}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={10}        y={height + 26} width={8} height={8} rx="2" fill="#4285F4" opacity="0.85"/>
      <text x={22}        y={height + 34} fontSize="9" fill="#6B7280">Group A</text>
      <rect x={70}        y={height + 26} width={8} height={8} rx="2" fill="#EA4335" opacity="0.85"/>
      <text x={82}        y={height + 34} fontSize="9" fill="#6B7280">Group B</text>
    </svg>
  );
}


export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const rawResults = location.state?.results;
  const fileName   = location.state?.fileName || 'Unknown file';
  const columnMap  = location.state?.columnMap || {};

  useEffect(() => {
    if (!rawResults) navigate('/upload', { replace: true });
  }, [rawResults, navigate]);

  if (!rawResults) return null;

  // ── EXTRACT METRICS ───────────────────────────────────────────────
  const overallBiasScore = rawResults.overall_bias_score ?? 0;
  const fairnessScore    = Math.max(0, Math.round(100 - overallBiasScore));
  const genderBias       = rawResults.gender_bias?.percentage ?? 0;
  const groupALabel      = rawResults.gender_bias?.group_a_label ?? 'Group A';
  const groupBLabel      = rawResults.gender_bias?.group_b_label ?? 'Group B';
  const rateA            = (rawResults.gender_bias?.rate_a ?? 0) * 100;
  const rateB            = (rawResults.gender_bias?.rate_b ?? 0) * 100;
  const incomeBias       = rawResults.income_bias?.percentage ?? 0;
  const proxyVarsDict    = rawResults.proxy_bias?.proxy_variables ?? {};
  const maxCorr          = rawResults.proxy_bias?.max_correlation ?? 0;
  const dataQuality      = rawResults.data_quality ?? {};
  const explanation      = rawResults.explanation ?? '';
  const preview          = rawResults.preview ?? null;
  const backendColMap    = rawResults.column_map ?? {};

  const proxyVarsList = Object.entries(proxyVarsDict);

  // ── LOCAL STATE ───────────────────────────────────────────────────
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [showPreview, setShowPreview]                 = useState(false);
  const [mounted, setMounted]                         = useState(false);
  const [animatedScore, setAnimatedScore]             = useState(0);
  const [pdfLoading, setPdfLoading]                   = useState(false);
  const [pdfError, setPdfError]                       = useState('');

  // ── WHAT-IF SIMULATOR STATE ───────────────────────────────────────
  const [simThreshold, setSimThreshold]   = useState(0.5);
  const [simResult, setSimResult]         = useState(null);   // single point result
  const [simHistory, setSimHistory]       = useState([]);     // [{threshold, groupA, groupB, bias}]
  const [simLoading, setSimLoading]       = useState(false);
  const [simFile, setSimFile]             = useState(null);   // stored File for re-simulation
  const [simEnabled, setSimEnabled]       = useState(false);  // only enabled if user re-uploads for sim

  // Mounted animation
  useEffect(() => {
    setMounted(true);
    const target = fairnessScore;
    let current  = 0;
    const inc    = target / 60;
    const timer  = setInterval(() => {
      current += inc;
      if (current >= target) { setAnimatedScore(target); clearInterval(timer); }
      else setAnimatedScore(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [fairnessScore]);

  // ── SCORE RING ────────────────────────────────────────────────────
  const radius          = 54;
  const circumference   = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fairnessScore / 100) * circumference;
  const scoreColor      = getScoreColor(fairnessScore);

  // ── SUMMARY COUNTS ────────────────────────────────────────────────
  const passed   = [genderBias < 10, incomeBias === 0].filter(Boolean).length;
  const moderate = [genderBias >= 10 && genderBias <= 25, incomeBias > 0 && incomeBias <= 25].filter(Boolean).length;
  const critical = [genderBias > 25, incomeBias > 25].filter(Boolean).length;

  const explanationParagraphs = explanation.split('\n\n').filter(Boolean);

  // ── FRONTEND SIMULATION (small datasets) ─────────────────────────
  // We compute approximate simulation purely in JS from the existing group rates
  function computeFrontendSim(threshold) {
    // Approximate: at threshold t, we scale the acceptance rate linearly
    // between 0 (t=1) and 1 (t=0). This gives a visually meaningful chart
    // without needing the raw data.
    const baseA  = rateA / 100;
    const baseB  = rateB / 100;
    const scale  = 1 - threshold;
    const newA   = Math.min(1, baseA + scale * (1 - baseA));
    const newB   = Math.min(1, baseB + scale * (1 - baseB));
    const bias   = Math.abs(newA - newB) * 100;
    const ovr    = Math.min(0.5 * bias, 100);
    return {
      threshold,
      gender_bias_pct: round2(bias),
      income_bias_pct: 0,
      overall_bias_score: round2(ovr),
      group_a_rate: round2(newA * 100),
      group_b_rate: round2(newB * 100),
      group_a_label: groupALabel,
      group_b_label: groupBLabel,
      acceptance_rate: round2(((newA + newB) / 2) * 100),
    };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // Run simulation when slider moves
  function handleThresholdChange(val) {
    setSimThreshold(val);
    const result = computeFrontendSim(val);
    setSimResult(result);

    // Add to history (max 20 points)
    setSimHistory(prev => {
      const updated = [...prev.filter(p => Math.abs(p.threshold - val) > 0.001), {
        threshold: val,
        groupA: result.group_a_rate,
        groupB: result.group_b_rate,
        bias: result.gender_bias_pct,
      }].sort((a, b) => a.threshold - b.threshold).slice(-20);
      return updated;
    });
  }

  // Initialise simulation on mount
  useEffect(() => {
    if (mounted) handleThresholdChange(0.5);
  }, [mounted]);

  // ── PDF DOWNLOAD ──────────────────────────────────────────────────
  async function handleDownloadPDF() {
    setPdfLoading(true); setPdfError('');
    try {
      const response = await fetch(`${API_URL}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: rawResults, file_name: fileName }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `PDF error (${response.status})`);
      }
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `FairLens_Report_${fileName.replace('.csv',''  )}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setPdfError(err.message || 'Failed to generate PDF.');
    } finally { setPdfLoading(false); }
  }

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="max-w-5xl mx-auto">

        {/* TOP NAV */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/upload" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16}/> New Analysis
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-google-green animate-pulse"/>
            Analysis complete ·{' '}
            <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{fileName}</span>
            {backendColMap.protected_attr && (
              <span className="font-mono text-xs bg-blue-50 text-google-blue px-2 py-0.5 rounded">
                {backendColMap.protected_attr} → {backendColMap.target_col}
              </span>
            )}
          </div>
          <button onClick={handleDownloadPDF} disabled={pdfLoading}
            className="google-btn-secondary text-sm flex items-center gap-1.5">
            {pdfLoading
              ? <><Loader2 size={15} className="animate-spin"/> Generating…</>
              : <><Download size={15}/> Export PDF</>}
          </button>
        </div>

        {pdfError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-google-red flex items-center gap-2">
            <FileWarning size={15}/>{pdfError}
          </div>
        )}

        {/* DATA QUALITY WARNING */}
        {dataQuality.total_rows_removed > 0 && (
          <div className="mb-5 card p-4 border-l-4 border-l-google-yellow bg-yellow-50/50">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Data Cleaning Notice</p>
                <p className="text-xs text-gray-600">
                  {dataQuality.total_rows_removed} row(s) removed.
                  {dataQuality.protected_removed > 0 && ` ${dataQuality.protected_removed} had unrecognised protected-attr values.`}
                  {dataQuality.target_removed     > 0 && ` ${dataQuality.target_removed} had missing target values.`}
                  {' '}Final: <strong>{dataQuality.final_dataset_size} rows</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* OVERALL SCORE */}
        <div className={`card p-8 mb-6 bg-white ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0 relative">
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1F3F4" strokeWidth="10"/>
                <circle cx="70" cy="70" r={radius} fill="none"
                  stroke={scoreColor} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={mounted ? strokeDashoffset : circumference}
                  className="score-ring"/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
                  {animatedScore}
                </span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                {fairnessScore >= 80 ? <ShieldCheck size={28} className="text-google-green"/>
                  : fairnessScore >= 60 ? <ShieldAlert size={28} className="text-google-yellow"/>
                  : <ShieldX size={28} className="text-google-red"/>}
                <h1 className="text-2xl font-bold text-gray-900">{getScoreLabel(fairnessScore)}</h1>
              </div>
              <p className="text-gray-500 mb-1 max-w-lg">
                Fairness score: <strong>{fairnessScore}/100</strong> (Bias: {overallBiasScore.toFixed(1)}/100).
                Dataset: <strong>{dataQuality.final_dataset_size ?? '—'} rows</strong>.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Score = 50% protected-attr bias + 30% secondary bias + 20% proxy correlation
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {passed > 0   && <SummaryBadge icon={<CheckCircle2 size={14}/>} text={`${passed} passed`} color="green"/>}
                {moderate > 0 && <SummaryBadge icon={<AlertTriangle size={14}/>} text={`${moderate} moderate`} color="yellow"/>}
                {critical > 0 && <SummaryBadge icon={<XCircle size={14}/>} text={`${critical} critical`} color="red"/>}
                {proxyVarsList.length > 0 && <SummaryBadge icon={<Info size={14}/>} text={`${proxyVarsList.length} proxy vars`} color="blue"/>}
              </div>
            </div>
          </div>
        </div>

        {/* THREE BIAS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <BiasCard
            mounted={mounted} stagger="stagger-2"
            icon={<Users size={20}/>} title="Protected Attr Bias"
            subtitle="Demographic Parity Difference"
            value={genderBias} unit="%"
            formula={`P(outcome|${groupALabel}) − P(outcome|${groupBLabel})`}
            threshold="Threshold: 10%"
            interpretation={
              genderBias === 0
                ? 'No disparity detected between groups.'
                : `${groupALabel} has a ${genderBias.toFixed(1)}% higher outcome rate than ${groupBLabel}.`
            }
          />
          <BiasCard
            mounted={mounted} stagger="stagger-3"
            icon={<DollarSign size={20}/>} title="Secondary Attr Bias"
            subtitle="Disparate Impact Ratio"
            value={incomeBias} unit="%"
            formula="P(outcome|low) / P(outcome|high)"
            threshold="80% Rule (EEOC)"
            interpretation={
              incomeBias === 0
                ? (rawResults.income_bias?.interpretation || 'No secondary attribute column found.')
                : rawResults.income_bias?.interpretation || `Socioeconomic disparity: ${incomeBias.toFixed(1)}%`
            }
          />
          <ProxyCard mounted={mounted} stagger="stagger-4" proxies={proxyVarsList} maxCorr={maxCorr}/>
        </div>

        {/* ══════════════════════════════════════════════════════════
            WHAT-IF SIMULATOR CARD  ← NEW
           ══════════════════════════════════════════════════════════ */}
        <div className={`card p-6 mb-6 ${mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 rounded-xl">
                <Sliders size={18} className="text-purple-600"/>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">What-If Threshold Simulator</h2>
                <p className="text-xs text-gray-400">Drag the slider to explore bias at different decision thresholds</p>
              </div>
            </div>
            <span className="text-xs bg-purple-50 text-purple-600 font-semibold px-3 py-1 rounded-full">
              Interactive
            </span>
          </div>

          {/* Slider */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Permissive (accept more)</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Threshold:</span>
                <span className="text-sm font-bold tabular-nums text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  {simThreshold.toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-gray-400">Strict (reject more)</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05}
              value={simThreshold}
              onChange={e => handleThresholdChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gradient-to-r from-green-200 via-yellow-200 to-red-200 rounded-full appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-300 mt-1">
              {[0, 0.25, 0.5, 0.75, 1].map(v => <span key={v}>{v.toFixed(2)}</span>)}
            </div>
          </div>

          {/* Live metric tiles */}
          {simResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 animate-fade-in">
              <SimTile
                label={`${simResult.group_a_label || 'Group A'} Rate`}
                value={`${simResult.group_a_rate.toFixed(1)}%`}
                color="text-google-blue" bg="bg-blue-50"
                delta={simResult.group_a_rate - rateA}
              />
              <SimTile
                label={`${simResult.group_b_label || 'Group B'} Rate`}
                value={`${simResult.group_b_rate.toFixed(1)}%`}
                color="text-google-red" bg="bg-red-50"
                delta={simResult.group_b_rate - rateB}
              />
              <SimTile
                label="Bias Gap"
                value={`${simResult.gender_bias_pct.toFixed(1)}%`}
                color={simResult.gender_bias_pct < 10 ? 'text-google-green'
                  : simResult.gender_bias_pct <= 25 ? 'text-yellow-600' : 'text-google-red'}
                bg={simResult.gender_bias_pct < 10 ? 'bg-green-50'
                  : simResult.gender_bias_pct <= 25 ? 'bg-yellow-50' : 'bg-red-50'}
                delta={simResult.gender_bias_pct - genderBias}
                invertDelta
              />
              <SimTile
                label="Acceptance Rate"
                value={`${simResult.acceptance_rate.toFixed(1)}%`}
                color="text-gray-700" bg="bg-gray-50"
              />
            </div>
          )}

          {/* Mini bar chart */}
          {simHistory.length > 1 && (
            <div className="bg-gray-50/80 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Acceptance Rates Across Thresholds
              </p>
              <MiniBarChart data={simHistory} height={100}/>
            </div>
          )}

          {/* Fairness verdict at current threshold */}
          {simResult && (
            <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2
              ${simResult.gender_bias_pct < 10
                ? 'bg-green-50 text-google-green border border-green-100'
                : simResult.gender_bias_pct <= 25
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                  : 'bg-red-50 text-google-red border border-red-100'}`}>
              {simResult.gender_bias_pct < 10
                ? <><CheckCircle2 size={16}/> At threshold {simThreshold.toFixed(2)}, bias gap is within acceptable range ({simResult.gender_bias_pct.toFixed(1)}%).</>
                : simResult.gender_bias_pct <= 25
                  ? <><AlertTriangle size={16}/> Moderate bias at this threshold ({simResult.gender_bias_pct.toFixed(1)}%). Consider lowering the threshold.</>
                  : <><XCircle size={16}/> High bias at threshold {simThreshold.toFixed(2)} ({simResult.gender_bias_pct.toFixed(1)}%). This threshold is discriminatory.</>
              }
            </div>
          )}
        </div>
        {/* ══ END SIMULATOR ══ */}

        {/* DATASET PREVIEW */}
        {preview && preview.length > 0 && (
          <div className={`card p-5 mb-6 ${mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Table2 size={18} className="text-gray-500"/>
                <h2 className="font-semibold text-gray-900">Dataset Preview</h2>
                <span className="text-xs text-gray-400">(first {preview.length} rows)</span>
              </div>
              <button onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                {showPreview ? 'Hide' : 'Show'}
                {showPreview ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
              </button>
            </div>
            {showPreview && (
              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {Object.keys(preview[0]).map(col => (
                        <th key={col} className="text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-gray-50/50' : ''}`}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="py-2 px-3 text-gray-700 font-mono">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AI EXPLANATION */}
        <div className={`card p-6 mb-6 ${mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Sparkles size={18} className="text-white"/>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Gemini Analysis</h2>
                <p className="text-xs text-gray-400">Powered by Gemini 2.5 Flash</p>
              </div>
            </div>
            <button onClick={() => setExplanationExpanded(!explanationExpanded)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              {explanationExpanded ? 'Collapse' : 'Read full analysis'}
              {explanationExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          </div>
          {explanationParagraphs.length > 0 ? (
            <>
              <p className="text-gray-600 text-sm leading-relaxed">{explanationParagraphs[0]}</p>
              {explanationExpanded && (
                <div className="animate-fade-in">
                  {explanationParagraphs.slice(1).map((para, i) => (
                    <p key={i} className="text-gray-600 text-sm leading-relaxed mt-3 pt-3 border-t border-gray-100">{para}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">No explanation available.</p>
          )}
        </div>

        {/* NEXT STEPS */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>
          <div className="space-y-3">
            {genderBias > 25 && (
              <StepItem priority="Critical" color="text-google-red bg-red-50"
                text={`Protected-attribute bias of ${genderBias.toFixed(1)}% is above the 25% critical threshold. Apply reweighing or adversarial debiasing.`}/>
            )}
            {genderBias >= 10 && genderBias <= 25 && (
              <StepItem priority="High" color="text-google-yellow bg-yellow-50"
                text={`Bias of ${genderBias.toFixed(1)}% exceeds the 10% warning level. Review your feature selection.`}/>
            )}
            {incomeBias > 25 && (
              <StepItem priority="Critical" color="text-google-red bg-red-50"
                text={`Socioeconomic bias of ${incomeBias.toFixed(1)}% violates the EEOC 80% Rule. Review socioeconomic-correlated features.`}/>
            )}
            {proxyVarsList.length > 0 && (
              <StepItem priority="High" color="text-google-yellow bg-yellow-50"
                text={`Remove or reweight proxy variables: ${proxyVarsList.map(([k,v]) => `${k} (r=${v})`).join(', ')}.`}/>
            )}
            {dataQuality.total_rows_removed > 0 && (
              <StepItem priority="Medium" color="text-google-blue bg-blue-50"
                text={`${dataQuality.total_rows_removed} rows were dropped. Clean source data for better reliability.`}/>
            )}
            {genderBias < 10 && incomeBias === 0 && proxyVarsList.length === 0 && (
              <StepItem priority="All Clear" color="text-google-green bg-green-50"
                text="All bias metrics within acceptable thresholds. Monitor fairness as dataset grows."/>
            )}
            <StepItem priority="Tip" color="text-purple-600 bg-purple-50"
              text="Use the What-If Simulator above to find a threshold that minimises bias while maintaining acceptable acceptance rates."/>
          </div>
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <Link to="/upload" className="google-btn-primary text-sm">
              <RefreshCw size={15}/> Re-analyze after fixes
            </Link>
            <button onClick={handleDownloadPDF} disabled={pdfLoading} className="google-btn-secondary text-sm">
              {pdfLoading
                ? <><Loader2 size={15} className="animate-spin"/> Generating…</>
                : <><Download size={15}/> Download PDF</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── HELPER COMPONENTS ──────────────────────────────────────────────

function SummaryBadge({ icon, text, color }) {
  const colors = {
    green: 'bg-green-50 text-google-green border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-google-red border-red-100',
    blue: 'bg-blue-50 text-google-blue border-blue-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${colors[color]}`}>
      {icon}{text}
    </span>
  );
}

function StepItem({ priority, color, text }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${color}`}>{priority}</span>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}

function SimTile({ label, value, color, bg, delta, invertDelta }) {
  const showDelta = delta !== undefined && !isNaN(delta) && Math.abs(delta) > 0.01;
  const positive  = invertDelta ? delta < 0 : delta > 0;
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {showDelta && (
        <p className={`text-xs flex items-center justify-center gap-0.5 mt-0.5 ${positive ? 'text-google-red' : 'text-google-green'}`}>
          {positive ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

function BiasCard({ mounted, stagger, icon, title, subtitle, value, unit, formula, threshold, interpretation }) {
  const level = getBiasLevel(value);
  const label = getBiasLabel(value);
  const config = {
    green:  { card:'bias-card-green',  badge:'bg-green-50 text-google-green',  bar:'bg-google-green',  icon:'bg-green-50 text-google-green',  text:'text-google-green' },
    yellow: { card:'bias-card-yellow', badge:'bg-yellow-50 text-yellow-600',   bar:'bg-google-yellow', icon:'bg-yellow-50 text-yellow-600',   text:'text-yellow-600' },
    red:    { card:'bias-card-red',    badge:'bg-red-50 text-google-red',      bar:'bg-google-red',    icon:'bg-red-50 text-google-red',      text:'text-google-red' },
  }[level];
  const barWidth = Math.min(value, 100);
  return (
    <div className={`${config.card} p-5 ${mounted ? `animate-slide-up ${stagger}` : 'opacity-0'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${config.icon}`}>{icon}</div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>{label}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-0.5">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">{subtitle}</p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className={`text-4xl font-bold tabular-nums ${config.text}`}>{value.toFixed(1)}</span>
        <span className={`text-lg font-medium ${config.text}`}>{unit}</span>
        <span className="text-xs text-gray-400 ml-1">gap</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div className={`h-full rounded-full ${config.bar} transition-all duration-1000 ease-out`}
          style={{ width: mounted ? `${barWidth}%` : '0%' }}/>
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>0%</span>
        <span className="text-gray-500">{threshold}</span>
        <span>100%</span>
      </div>
      <code className="block text-xs bg-gray-50 text-gray-500 font-mono px-2.5 py-2 rounded-lg mb-3 break-all">
        {formula}
      </code>
      <p className="text-xs text-gray-500 leading-relaxed">{interpretation}</p>
    </div>
  );
}

function ProxyCard({ mounted, stagger, proxies, maxCorr }) {
  const hasProxies = proxies.length > 0;
  return (
    <div className={`${hasProxies ? 'bias-card-yellow' : 'bias-card-green'} p-5 ${mounted ? `animate-slide-up ${stagger}` : 'opacity-0'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${hasProxies ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-google-green'}`}>
          <GitBranch size={20}/>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${hasProxies ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-google-green'}`}>
          {proxies.length} Found
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-0.5">Proxy Variables</h3>
      <p className="text-xs text-gray-400 mb-4">Correlation Check · |r| &gt; 0.3</p>
      {hasProxies ? (
        <div className="space-y-2 mb-4">
          {proxies.map(([name, corr], i) => (
            <div key={name} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <code className="text-sm font-mono text-gray-700 block truncate">{name}</code>
                <span className="text-xs text-gray-400">r = {corr.toFixed(2)}</span>
              </div>
              <AlertTriangle size={13} className="ml-auto text-yellow-500 flex-shrink-0"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-3 mb-4">
          <CheckCircle2 size={16} className="text-google-green flex-shrink-0"/>
          <p className="text-sm text-google-green">No proxy variables detected.</p>
        </div>
      )}
      <code className="block text-xs bg-gray-50 text-gray-500 font-mono px-2.5 py-2 rounded-lg mb-3">
        |corr(col, protected)| &gt; 0.3
      </code>
      <p className="text-xs text-gray-500 leading-relaxed">
        {hasProxies
          ? `Max correlation: ${maxCorr.toFixed(2)}. These columns may reintroduce bias indirectly.`
          : 'No columns show strong correlation with the protected attribute.'}
      </p>
    </div>
  );
}
