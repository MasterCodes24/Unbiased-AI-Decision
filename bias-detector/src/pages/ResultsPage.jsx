// pages/ResultsPage.jsx — Phase 2 + Phase 3
// Reads REAL bias results from React Router state (set by UploadPage after API call).
// Phase 3 additions: PDF download, dataset preview, data quality warnings, column mapping notes.

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, Download,
  RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Info, Users, DollarSign, GitBranch, Sparkles,
  ChevronDown, ChevronUp, Table2, FileWarning, Loader2
} from 'lucide-react';

import { getBiasLevel, getBiasLabel, getScoreColor, getScoreLabel } from '../data/mockData';
import { API_URL } from '../config';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── PULL REAL DATA FROM ROUTER STATE ────────────────────────────
  // UploadPage navigates here with: navigate('/results', { state: { results, fileName } })
  const rawResults = location.state?.results;
  const fileName = location.state?.fileName || 'Unknown file';

  // If user navigates directly to /results without uploading, redirect them
  useEffect(() => {
    if (!rawResults) {
      navigate('/upload', { replace: true });
    }
  }, [rawResults, navigate]);

  if (!rawResults) return null; // Render nothing while redirecting

  // ── MAP BACKEND RESPONSE TO LOCAL VARIABLES ─────────────────────
  // Backend shape:
  // {
  //   overall_bias_score: number (0-100, HIGHER = MORE BIAS),
  //   gender_bias: { percentage: number },
  //   income_bias: { percentage: number, interpretation: string },
  //   proxy_bias: { proxy_variables: { colName: correlation }, max_correlation: number },
  //   data_quality: { gender_removed, hired_removed, total_rows_removed, final_dataset_size },
  //   explanation: string,
  //   preview: [ { col: val, ... }, ... ]   // first 5 rows (Phase 3, optional)
  // }

  const overallBiasScore = rawResults.overall_bias_score ?? 0;
  const fairnessScore = Math.max(0, Math.round(100 - overallBiasScore)); // Inverted for display
  const genderBias = rawResults.gender_bias?.percentage ?? 0;
  const incomeBias = rawResults.income_bias?.percentage ?? 0;
  const proxyVarsDict = rawResults.proxy_bias?.proxy_variables ?? {};   // { colName: correlation }
  const maxCorr = rawResults.proxy_bias?.max_correlation ?? 0;
  const dataQuality = rawResults.data_quality ?? {};
  const explanation = rawResults.explanation ?? '';
  const preview = rawResults.preview ?? null; // Array of row objects (Phase 3)

  const proxyVarsList = Object.entries(proxyVarsDict); // [ [name, corr], ... ]

  // ── STATE ────────────────────────────────────────────────────────
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    setMounted(true);
    const target = fairnessScore;
    let current = 0;
    const increment = target / 60;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setAnimatedScore(target); clearInterval(timer); }
      else setAnimatedScore(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [fairnessScore]);

  // ── SCORE RING ───────────────────────────────────────────────────
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (fairnessScore / 100) * circumference;
  const scoreColor = getScoreColor(fairnessScore);
  const scoreLabel = getScoreLabel(fairnessScore);

  // ── SUMMARY BADGE COUNTS ─────────────────────────────────────────
  const passed = [genderBias < 10, incomeBias === 0].filter(Boolean).length;
  const moderate = [genderBias >= 10 && genderBias <= 25, incomeBias > 0 && incomeBias <= 25].filter(Boolean).length;
  const critical = [genderBias > 25, incomeBias > 25].filter(Boolean).length;
  const proxyCount = proxyVarsList.length;

  // ── AI EXPLANATION PARAGRAPHS ────────────────────────────────────
  const explanationParagraphs = explanation.split('\n\n').filter(Boolean);

  // ── PHASE 3: PDF DOWNLOAD ────────────────────────────────────────
  // Sends the bias results to /export-pdf, gets back a PDF blob, triggers download.
  async function handleDownloadPDF() {
    setPdfLoading(true);
    setPdfError('');
    try {
      const response = await fetch(`${API_URL}/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: rawResults, file_name: fileName }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `PDF generation failed (${response.status})`);
      }

      // Trigger file download from blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FairLens_Report_${fileName.replace('.csv', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setPdfError(err.message || 'Failed to generate PDF.');
    } finally {
      setPdfLoading(false);
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="max-w-5xl mx-auto">

        {/* ── TOP NAV ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/upload"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            New Analysis
          </Link>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-google-green animate-pulse"></div>
              Analysis complete ·{' '}
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{fileName}</span>
            </div>
          </div>

          {/* PDF Download Button (Phase 3) */}
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="google-btn-secondary text-sm flex items-center gap-1.5"
          >
            {pdfLoading
              ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
              : <><Download size={15} /> Export PDF</>
            }
          </button>
        </div>

        {/* PDF Error */}
        {pdfError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-google-red flex items-center gap-2">
            <FileWarning size={15} />
            {pdfError}
          </div>
        )}

        {/* ── DATA QUALITY WARNING ─────────────────────────────────── */}
        {dataQuality.total_rows_removed > 0 && (
          <div className="mb-5 card p-4 border-l-4 border-l-google-yellow bg-yellow-50/50">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Data Cleaning Notice</p>
                <p className="text-xs text-gray-600">
                  {dataQuality.total_rows_removed} row(s) were removed before analysis.
                  {dataQuality.gender_removed > 0 && ` ${dataQuality.gender_removed} had unrecognized gender values.`}
                  {dataQuality.hired_removed > 0 && ` ${dataQuality.hired_removed} had missing "Hired" values.`}
                  {' '}Final dataset size: <strong>{dataQuality.final_dataset_size} rows</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── OVERALL SCORE CARD ───────────────────────────────────── */}
        <div className={`card p-8 mb-6 bg-white ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">

            {/* Score Ring SVG */}
            <div className="flex-shrink-0 relative">
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1F3F4" strokeWidth="10" />
                <circle
                  cx="70" cy="70" r={radius} fill="none"
                  stroke={scoreColor} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={mounted ? strokeDashoffset : circumference}
                  className="score-ring"
                />
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
                <ScoreIcon score={fairnessScore} />
                <h1 className="text-2xl font-bold text-gray-900">{scoreLabel}</h1>
              </div>
              <p className="text-gray-500 mb-1 max-w-lg">
                Fairness score: <strong>{fairnessScore}/100</strong> (Bias score: {overallBiasScore.toFixed(1)}/100).
                {' '}Dataset: <strong>{dataQuality.final_dataset_size ?? '—'} rows</strong> analyzed.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Score = 50% gender bias + 30% income bias + 20% proxy correlation
              </p>

              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {passed > 0 && <SummaryBadge icon={<CheckCircle2 size={14}/>} text={`${passed} metric${passed > 1 ? 's' : ''} passed`} color="green" />}
                {moderate > 0 && <SummaryBadge icon={<AlertTriangle size={14}/>} text={`${moderate} moderate concern${moderate > 1 ? 's' : ''}`} color="yellow" />}
                {critical > 0 && <SummaryBadge icon={<XCircle size={14}/>} text={`${critical} critical finding${critical > 1 ? 's' : ''}`} color="red" />}
                {proxyCount > 0 && <SummaryBadge icon={<Info size={14}/>} text={`${proxyCount} proxy variable${proxyCount > 1 ? 's' : ''} flagged`} color="blue" />}
              </div>
            </div>
          </div>
        </div>

        {/* ── THREE BIAS CARDS ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

          <BiasCard
            mounted={mounted} stagger="stagger-2"
            icon={<Users size={20} />}
            title="Gender Bias"
            subtitle="Demographic Parity Difference"
            value={genderBias}
            unit="%"
            formula="P(hired|♀) − P(hired|♂)"
            threshold="Threshold: 10%"
            interpretation={
              genderBias === 0
                ? 'No gender disparity detected in hiring rates.'
                : `Female candidates are hired at a ${genderBias.toFixed(1)}% lower rate than male candidates.`
            }
          />

          <BiasCard
            mounted={mounted} stagger="stagger-3"
            icon={<DollarSign size={20} />}
            title="Income Bias"
            subtitle="Disparate Impact Ratio"
            value={incomeBias}
            unit="%"
            formula="P(hired|low) / P(hired|high)"
            threshold="80% Rule (EEOC)"
            interpretation={
              incomeBias === 0
                ? rawResults.income_bias?.interpretation === 'Income data not provided.'
                  ? 'No Income column found in dataset — skipped.'
                  : 'No significant income-based disparity detected.'
                : rawResults.income_bias?.interpretation || `Low-income applicants hired at ${incomeBias.toFixed(1)}% lower rate.`
            }
          />

          <ProxyCard
            mounted={mounted} stagger="stagger-4"
            proxies={proxyVarsList}
            maxCorr={maxCorr}
          />

        </div>

        {/* ── PHASE 3: DATASET PREVIEW ─────────────────────────────── */}
        {preview && preview.length > 0 && (
          <div className={`card p-5 mb-6 ${mounted ? 'animate-slide-up stagger-4' : 'opacity-0'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Table2 size={18} className="text-gray-500" />
                <h2 className="font-semibold text-gray-900">Dataset Preview</h2>
                <span className="text-xs text-gray-400">(first {preview.length} rows)</span>
              </div>
              <button
                onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
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
                        <th key={col} className="text-left py-2 px-3 font-semibold text-gray-500 uppercase tracking-wide">
                          {col}
                        </th>
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

        {/* ── AI EXPLANATION CARD ──────────────────────────────────── */}
        <div className={`card p-6 mb-6 ${mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Gemini Analysis</h2>
                <p className="text-xs text-gray-400">Powered by Gemini 2.5 Flash</p>
              </div>
            </div>
            <button
              onClick={() => setExplanationExpanded(!explanationExpanded)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
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
                    <p key={i} className="text-gray-600 text-sm leading-relaxed mt-3 pt-3 border-t border-gray-100">
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">No explanation available.</p>
          )}
        </div>

        {/* ── RECOMMENDED NEXT STEPS ───────────────────────────────── */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>
          <div className="space-y-3">

            {/* Dynamic steps based on actual bias findings */}
            {genderBias > 25 && (
              <StepItem priority="Critical" color="text-google-red bg-red-50"
                text={`Gender bias of ${genderBias.toFixed(1)}% is above the critical 25% threshold. Apply fairness constraints (e.g., reweighing or adversarial debiasing) during model retraining.`} />
            )}
            {genderBias >= 10 && genderBias <= 25 && (
              <StepItem priority="High" color="text-google-yellow bg-yellow-50"
                text={`Gender bias of ${genderBias.toFixed(1)}% exceeds the 10% warning threshold. Review your selection criteria for unintentional gender-correlated features.`} />
            )}
            {incomeBias > 25 && (
              <StepItem priority="Critical" color="text-google-red bg-red-50"
                text={`Income bias of ${incomeBias.toFixed(1)}% violates the EEOC 80% rule. Low-income applicants face significant systemic disadvantage — review income-correlated features.`} />
            )}
            {proxyVarsList.length > 0 && (
              <StepItem priority="High" color="text-google-yellow bg-yellow-50"
                text={`Remove or re-weight proxy variables: ${proxyVarsList.map(([k,v]) => `${k} (r=${v})`).join(', ')}. These correlate with sensitive attributes and reintroduce bias.`} />
            )}
            {dataQuality.total_rows_removed > 0 && (
              <StepItem priority="Medium" color="text-google-blue bg-blue-50"
                text={`${dataQuality.total_rows_removed} rows were dropped due to invalid/missing values. Clean your source data to increase analysis reliability.`} />
            )}
            {genderBias < 10 && incomeBias === 0 && proxyVarsList.length === 0 && (
              <StepItem priority="Complete" color="text-google-green bg-green-50"
                text="All bias metrics are within acceptable thresholds. Continue monitoring fairness metrics as your dataset grows." />
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <Link to="/upload" className="google-btn-primary text-sm">
              <RefreshCw size={15} />
              Re-analyze after fixes
            </Link>
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="google-btn-secondary text-sm"
            >
              {pdfLoading
                ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                : <><Download size={15} /> Download Report</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── HELPER COMPONENTS ─────────────────────────────────────────────

function ScoreIcon({ score }) {
  if (score >= 80) return <ShieldCheck size={28} className="text-google-green" />;
  if (score >= 60) return <ShieldAlert size={28} className="text-google-yellow" />;
  return <ShieldX size={28} className="text-google-red" />;
}

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
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${color}`}>
        {priority}
      </span>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}

// ── BIAS CARD ─────────────────────────────────────────────────────
function BiasCard({ mounted, stagger, icon, title, subtitle, value, unit, formula, threshold, interpretation }) {
  const level = getBiasLevel(value);
  const label = getBiasLabel(value);

  const config = {
    green:  { card: 'bias-card-green',  badge: 'bg-green-50 text-google-green',   bar: 'bg-google-green',  icon: 'bg-green-50 text-google-green',  text: 'text-google-green' },
    yellow: { card: 'bias-card-yellow', badge: 'bg-yellow-50 text-yellow-600',    bar: 'bg-google-yellow', icon: 'bg-yellow-50 text-yellow-600',   text: 'text-yellow-600' },
    red:    { card: 'bias-card-red',    badge: 'bg-red-50 text-google-red',        bar: 'bg-google-red',    icon: 'bg-red-50 text-google-red',      text: 'text-google-red' },
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
        <div
          className={`h-full rounded-full ${config.bar} transition-all duration-1000 ease-out`}
          style={{ width: mounted ? `${barWidth}%` : '0%' }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>0%</span>
        <span className="text-gray-500">{threshold}</span>
        <span>100%</span>
      </div>

      <code className="block text-xs bg-gray-50 text-gray-500 font-mono px-2.5 py-2 rounded-lg mb-3">
        {formula}
      </code>

      <p className="text-xs text-gray-500 leading-relaxed">{interpretation}</p>
    </div>
  );
}

// ── PROXY VARIABLES CARD ──────────────────────────────────────────
function ProxyCard({ mounted, stagger, proxies, maxCorr }) {
  const hasProxies = proxies.length > 0;

  return (
    <div className={`${hasProxies ? 'bias-card-yellow' : 'bias-card-green'} p-5 ${mounted ? `animate-slide-up ${stagger}` : 'opacity-0'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${hasProxies ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-google-green'}`}>
          <GitBranch size={20} />
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
              <AlertTriangle size={13} className="ml-auto text-yellow-500 flex-shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-3 mb-4">
          <CheckCircle2 size={16} className="text-google-green flex-shrink-0" />
          <p className="text-sm text-google-green">No proxy variables detected.</p>
        </div>
      )}

      <code className="block text-xs bg-gray-50 text-gray-500 font-mono px-2.5 py-2 rounded-lg mb-3">
        |corr(col, gender)| &gt; 0.3
      </code>

      <p className="text-xs text-gray-500 leading-relaxed">
        {hasProxies
          ? `Max correlation: ${maxCorr.toFixed(2)}. These columns statistically encode sensitive attributes and may reintroduce bias even when excluded.`
          : 'No columns show strong correlation with the gender attribute. Dataset looks clean on this front.'
        }
      </p>
    </div>
  );
}
