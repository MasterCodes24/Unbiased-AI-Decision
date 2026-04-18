// ResultsPage.jsx — The full bias audit dashboard at URL: "/results"
// This page reads from MOCK_DATA and visualizes it as a professional report.
// In Phase 2, we'll replace MOCK_DATA with a real API response.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, ShieldAlert, ShieldX, ArrowLeft, Download,
  RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Info, Users, DollarSign, GitBranch, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

// Import our mock data — this simulates the API JSON response
import { MOCK_DATA, getBiasLevel, getBiasLabel } from '../data/mockData';

export default function ResultsPage() {
  // Track whether the AI explanation is expanded or collapsed
  const [explanationExpanded, setExplanationExpanded] = useState(false);
  // Track if the page has "loaded in" (for animations)
  const [mounted, setMounted] = useState(false);
  // The score we animate from 0 → actual score
  const [animatedScore, setAnimatedScore] = useState(0);

  // useEffect runs code AFTER the component renders for the first time
  // It's perfect for animations that should start when the page loads
  useEffect(() => {
    setMounted(true); // Trigger CSS animations

    // Count-up animation for the overall score number
    const target = MOCK_DATA.overall_score;
    let current = 0;
    const increment = target / 60; // 60 steps over ~1 second
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, 16); // 16ms ≈ 60fps

    return () => clearInterval(timer); // Cleanup when component unmounts
  }, []);

  // ── CIRCULAR SCORE RING ──────────────────────────────────────
  // SVG math: circumference of a circle with radius 54
  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ≈ 339
  // How much of the circle to "fill" based on the score
  const strokeDashoffset = circumference - (MOCK_DATA.overall_score / 100) * circumference;
  
  // Determine the ring color based on score
  const scoreColor = MOCK_DATA.overall_score >= 80 
    ? '#34A853'  // Google Green 
    : MOCK_DATA.overall_score >= 60 
      ? '#FBBC05' // Google Yellow
      : '#EA4335'; // Google Red

  // The 3 paragraphs of the AI explanation
  const explanationParagraphs = MOCK_DATA.ai_explanation.split('\n\n');

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-6">
      <div className="max-w-5xl mx-auto">

        {/* ── TOP NAVIGATION ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            to="/upload" 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            New Analysis
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-google-green animate-pulse"></div>
            Analysis complete · Just now
          </div>

          {/* Download button — in Phase 3 this will export a PDF */}
          <button className="google-btn-secondary text-sm opacity-60 cursor-not-allowed" disabled>
            <Download size={15} />
            Export PDF
            <span className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-400">Phase 3</span>
          </button>
        </div>

        {/* ── OVERALL SCORE HEADER CARD ──────────────────────────── */}
        <div className={`card p-8 mb-6 bg-white ${mounted ? 'animate-slide-up stagger-1' : 'opacity-0'}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            
            {/* Circular SVG score ring */}
            <div className="flex-shrink-0 relative">
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                {/* Background grey track */}
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1F3F4" strokeWidth="10" />
                {/* Colored progress arc */}
                <circle
                  cx="70" cy="70" r={radius} fill="none"
                  stroke={scoreColor} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={mounted ? strokeDashoffset : circumference}
                  className="score-ring"
                />
              </svg>
              {/* Score number in center of ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>
                  {animatedScore}
                </span>
                <span className="text-xs text-gray-400">/ 100</span>
              </div>
            </div>

            {/* Score description text */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <ScoreIcon score={MOCK_DATA.overall_score} />
                <h1 className="text-2xl font-bold text-gray-900">
                  {MOCK_DATA.overall_score >= 80 ? 'Mostly Fair' : 
                   MOCK_DATA.overall_score >= 60 ? 'Moderate Concern' : 'High Risk Model'}
                </h1>
              </div>
              <p className="text-gray-500 mb-4 max-w-lg">
                Your model scored <strong>{MOCK_DATA.overall_score}/100</strong> on the FairLens audit. 
                Two significant issues were detected that should be addressed before deployment.
              </p>
              
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <SummaryBadge icon={<CheckCircle2 size={14}/>} text="1 metric passed" color="green" />
                <SummaryBadge icon={<AlertTriangle size={14}/>} text="1 moderate concern" color="yellow" />
                <SummaryBadge icon={<XCircle size={14}/>} text="1 critical finding" color="red" />
                <SummaryBadge icon={<Info size={14}/>} text="3 proxy variables flagged" color="blue" />
              </div>
            </div>
          </div>
        </div>

        {/* ── THREE BIAS METRIC CARDS ────────────────────────────── */}
        {/* 'grid grid-cols-1 md:grid-cols-3' = stacked on mobile, 3 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

          {/* CARD 1: Gender Bias */}
          <BiasCard
            mounted={mounted}
            stagger="stagger-2"
            icon={<Users size={20} />}
            title="Gender Bias"
            subtitle="Demographic Parity Difference"
            value={MOCK_DATA.demographic_parity}
            unit="%"
            formula="P(hired|♀) − P(hired|♂)"
            threshold="Threshold: 10%"
            description="The hiring rate gap between female and male candidates."
            interpretation={`Female candidates are hired ${MOCK_DATA.demographic_parity}% less often than male candidates.`}
          />

          {/* CARD 2: Income Bias */}
          <BiasCard
            mounted={mounted}
            stagger="stagger-3"
            icon={<DollarSign size={20} />}
            title="Income Bias"
            subtitle="Disparate Impact Ratio"
            value={MOCK_DATA.income_bias}
            unit="%"
            formula="P(hired|low) / P(hired|high)"
            threshold="80% Rule (EEOC)"
            description="Measures if low-income applicants face systemic disadvantage."
            interpretation={`Low-income candidates are ${MOCK_DATA.income_bias}% less likely to be hired. Fails the EEOC 80% rule.`}
          />

          {/* CARD 3: Proxy Variables */}
          <ProxyCard
            mounted={mounted}
            stagger="stagger-4"
            proxies={MOCK_DATA.proxy_variables}
          />
        </div>

        {/* ── AI EXPLANATION CARD ─────────────────────────────────── */}
        <div className={`card p-6 mb-6 ${mounted ? 'animate-slide-up stagger-5' : 'opacity-0'}`}>
          
          {/* Card header with Gemini branding */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Gemini Analysis</h2>
                <p className="text-xs text-gray-400">Powered by Gemini 1.5 Flash</p>
              </div>
            </div>
            {/* Expand/collapse button */}
            <button
              onClick={() => setExplanationExpanded(!explanationExpanded)}
              className="flex items-center gap-1.5 text-sm text-gray-500 
                         hover:text-gray-900 transition-colors"
            >
              {explanationExpanded ? 'Collapse' : 'Read full analysis'}
              {explanationExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          </div>

          {/* First paragraph always visible */}
          <p className="text-gray-600 text-sm leading-relaxed">
            {explanationParagraphs[0]}
          </p>

          {/* Remaining paragraphs only show when expanded */}
          {explanationExpanded && (
            <div className="animate-fade-in">
              {explanationParagraphs.slice(1).map((para, i) => (
                <p key={i} className="text-gray-600 text-sm leading-relaxed mt-3 pt-3 border-t border-gray-100">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── NEXT STEPS CARD ────────────────────────────────────── */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>
          <div className="space-y-3">
            {[
              { 
                priority: 'Critical', 
                color: 'text-google-red bg-red-50', 
                text: 'Remove or re-weight "Zip Code" and "College Name" — these are proxy variables for income.' 
              },
              { 
                priority: 'High', 
                color: 'text-google-yellow bg-yellow-50', 
                text: 'Apply a fairness constraint (e.g., adversarial debiasing) during model retraining to reduce gender disparity.' 
              },
              { 
                priority: 'Medium', 
                color: 'text-google-blue bg-blue-50', 
                text: 'Audit "Commute Distance" feature — shows 0.41 correlation with gender in your dataset.' 
              },
              { 
                priority: 'Complete', 
                color: 'text-google-green bg-green-50', 
                text: 'Experience Years feature shows no significant bias. No action required.' 
              },
            ].map(({ priority, color, text }, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/80">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${color}`}>
                  {priority}
                </span>
                <p className="text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>

          {/* CTA at bottom */}
          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <Link to="/upload" className="google-btn-primary text-sm">
              <RefreshCw size={15} />
              Re-analyze after fixes
            </Link>
            <button className="google-btn-secondary text-sm opacity-50 cursor-not-allowed" disabled>
              <Download size={15} />
              Download Report (Phase 3)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── HELPER COMPONENTS ─────────────────────────────────────────────

// Shows the right shield icon based on score
function ScoreIcon({ score }) {
  if (score >= 80) return <ShieldCheck size={28} className="text-google-green" />;
  if (score >= 60) return <ShieldAlert size={28} className="text-google-yellow" />;
  return <ShieldX size={28} className="text-google-red" />;
}

// Small colored badge (e.g., "1 metric passed" in green)
function SummaryBadge({ icon, text, color }) {
  const colors = {
    green: 'bg-green-50 text-google-green border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-google-red border-red-100',
    blue: 'bg-blue-50 text-google-blue border-blue-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium 
                      px-3 py-1 rounded-full border ${colors[color]}`}>
      {icon}
      {text}
    </span>
  );
}

// ── BIAS CARD ─────────────────────────────────────────────────────
// Used for Gender Bias and Income Bias cards.
// The 'value' prop determines the color: > 20 = Red, 10-20 = Yellow, < 10 = Green
function BiasCard({ mounted, stagger, icon, title, subtitle, value, unit, formula, threshold, description, interpretation }) {
  const level = getBiasLevel(value);
  const label = getBiasLabel(value);

  // Map level to colors
  const config = {
    green: { 
      card: 'bias-card-green',
      badge: 'bg-green-50 text-google-green',
      bar: 'bg-google-green',
      icon: 'bg-green-50 text-google-green',
      text: 'text-google-green'
    },
    yellow: { 
      card: 'bias-card-yellow',
      badge: 'bg-yellow-50 text-yellow-600',
      bar: 'bg-google-yellow',
      icon: 'bg-yellow-50 text-yellow-600',
      text: 'text-yellow-600'
    },
    red: { 
      card: 'bias-card-red',
      badge: 'bg-red-50 text-google-red',
      bar: 'bg-google-red',
      icon: 'bg-red-50 text-google-red',
      text: 'text-google-red'
    },
  }[level];

  // Bar width: value as a % of 100, clamped to 100%
  const barWidth = Math.min(value, 100);

  return (
    <div className={`${config.card} p-5 ${mounted ? `animate-slide-up ${stagger}` : 'opacity-0'}`}>
      
      {/* Card top row: icon + risk badge */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${config.icon}`}>{icon}</div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.badge}`}>
          {label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-0.5">{title}</h3>
      <p className="text-xs text-gray-400 mb-3">{subtitle}</p>

      {/* Big number */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className={`text-4xl font-bold tabular-nums ${config.text}`}>{value}</span>
        <span className={`text-lg font-medium ${config.text}`}>{unit}</span>
        <span className="text-xs text-gray-400 ml-1">gap</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <div 
          className={`h-full rounded-full ${config.bar} transition-all duration-1000 ease-out`}
          style={{ width: mounted ? `${barWidth}%` : '0%' }}
        />
      </div>

      {/* Threshold label */}
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>0%</span>
        <span className="text-gray-500">{threshold}</span>
        <span>100%</span>
      </div>

      {/* Formula */}
      <code className="block text-xs bg-gray-50 text-gray-500 font-mono px-2.5 py-2 rounded-lg mb-3">
        {formula}
      </code>

      {/* Interpretation */}
      <p className="text-xs text-gray-500 leading-relaxed">{interpretation}</p>
    </div>
  );
}

// ── PROXY VARIABLES CARD ──────────────────────────────────────────
// A special card for the list of detected proxy columns.
function ProxyCard({ mounted, stagger, proxies }) {
  return (
    <div className={`bias-card-yellow p-5 ${mounted ? `animate-slide-up ${stagger}` : 'opacity-0'}`}>
      
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-yellow-50 text-yellow-600">
          <GitBranch size={20} />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600">
          {proxies.length} Found
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-0.5">Proxy Variables</h3>
      <p className="text-xs text-gray-400 mb-4">Correlation Check · |r| &gt; 0.3</p>

      {/* List of proxy columns */}
      <div className="space-y-2 mb-4">
        {proxies.map((proxy, i) => (
          <div key={proxy} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-600 
                            flex items-center justify-center text-xs font-bold flex-shrink-0">
              {i + 1}
            </div>
            <code className="text-sm font-mono text-gray-700">{proxy}</code>
            <AlertTriangle size={13} className="ml-auto text-yellow-500 flex-shrink-0" />
          </div>
        ))}
      </div>

      <code className="block text-xs bg-gray-50 text-gray-500 font-mono px-2.5 py-2 rounded-lg mb-3">
        |corr(col, sensitive)| &gt; 0.3
      </code>

      <p className="text-xs text-gray-500 leading-relaxed">
        These columns are statistically linked to sensitive attributes and may 
        re-introduce bias even when those attributes are excluded.
      </p>
    </div>
  );
}
