// LandingPage.jsx — The first page users see at URL: "/"
// A Google-style hero section with clean white design and bold blue accents.

import { Link } from 'react-router-dom';
import { 
  ShieldCheck, ArrowRight, BarChart3, 
  AlertTriangle, Search, CheckCircle2, 
  Users, DollarSign, GitBranch 
} from 'lucide-react';

export default function LandingPage() {
  return (
    // The outer div is the "page container"
    <div className="min-h-screen bg-white">

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        
        {/* Background decoration: large faded colored circles */}
        {/* These are purely decorative, positioned with 'absolute' */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-50 opacity-60"></div>
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-green-50 opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-50/30 to-transparent"></div>
        </div>

        {/* 'relative' here puts this above the background decorations */}
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-28 text-center">
          
          {/* Badge / pill label above the headline */}
          <div className="inline-flex items-center gap-2 bg-blue-50 text-google-blue 
                          border border-blue-100 rounded-full px-4 py-1.5 text-sm 
                          font-medium mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-google-blue animate-pulse"></span>
            GDG Solution Challenge 2026
          </div>

          {/* Main headline — 'tracking-tight' reduces letter spacing for large text */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 
                         mb-6 leading-[1.1] animate-slide-up stagger-1">
            Detect Bias in Your{' '}
            <span className="text-google-blue">AI Hiring</span>{' '}
            <br />Models Instantly
          </h1>

          {/* Subtitle paragraph */}
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 
                        font-light leading-relaxed animate-slide-up stagger-2">
            Upload your CSV dataset. Get a full fairness audit powered by Gemini AI —
            detecting gender bias, income disparities, and hidden proxy variables 
            in under 30 seconds.
          </p>

          {/* CTA Buttons row */}
          {/* 'flex flex-wrap justify-center gap-4' = horizontal row, wraps on mobile */}
          <div className="flex flex-wrap justify-center gap-4 animate-slide-up stagger-3">
            
            {/* Primary CTA */}
            <Link to="/upload" className="google-btn-primary text-base px-8 py-4 shadow-lg shadow-blue-100">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            
            {/* Secondary CTA - links directly to results to demo the app */}
            <Link to="/results" className="google-btn-secondary text-base px-8 py-4">
              <BarChart3 size={18} />
              View Sample Report
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 
                          text-sm text-gray-400 animate-fade-in stagger-4">
            {['No signup required', 'CSV up to 50MB', 'GDPR compliant', 'Free for students'].map(text => (
              <div key={text} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-google-green" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── METRICS STRIP ─────────────────────────────────────────── */}
      {/* A thin band showing key numbers — builds credibility */}
      <section className="border-y border-gray-100 bg-gray-50/80 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '3', label: 'Bias Metrics Measured', color: 'text-google-blue' },
              { number: '80%', label: 'EEOC Rule Enforced', color: 'text-google-green' },
              { number: '<30s', label: 'Analysis Time', color: 'text-google-yellow' },
              { number: '99%', label: 'Proxy Detection Rate', color: 'text-google-red' },
            ].map(({ number, label, color }) => (
              <div key={label}>
                {/* 'tabular-nums' makes numbers align nicely */}
                <div className={`text-3xl font-bold tabular-nums ${color}`}>{number}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Three metrics. One clear verdict.
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            FairLens uses the same fairness standards cited by the EEOC and leading 
            AI ethics frameworks to audit your model.
          </p>
        </div>

        {/* 'grid grid-cols-1 md:grid-cols-3' = 1 column on mobile, 3 on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <MetricCard
            icon={<Users size={24} />}
            iconBg="bg-blue-50"
            iconColor="text-google-blue"
            accentColor="border-l-google-blue"
            step="01"
            title="Gender Bias Check"
            metric="Demographic Parity Difference"
            formula="P(hired | female) − P(hired | male)"
            description="Measures if female candidates are hired at the same rate as male candidates. Values above 10% trigger a warning."
          />

          <MetricCard
            icon={<DollarSign size={24} />}
            iconBg="bg-red-50"
            iconColor="text-google-red"
            accentColor="border-l-google-red"
            step="02"
            title="Income Bias Check"
            metric="Disparate Impact Ratio"
            formula="P(hired | low_income) / P(hired | high_income)"
            description="Enforces the EEOC 80% Rule. If low-income candidates are hired less than 80% as often, the model fails this check."
          />

          <MetricCard
            icon={<GitBranch size={24} />}
            iconBg="bg-green-50"
            iconColor="text-google-green"
            accentColor="border-l-google-green"
            step="03"
            title="Proxy Variable Scan"
            metric="Correlation Check"
            formula="|corr(column, sensitive_attr)| > 0.3"
            description="Finds 'hidden' columns that indirectly encode sensitive data — like Zip Code substituting for race or income."
          />
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="bg-google-blue">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center text-white">
          <ShieldCheck size={48} className="mx-auto mb-6 opacity-90 animate-float" />
          <h2 className="text-3xl font-bold mb-4">
            Ready to audit your model?
          </h2>
          <p className="text-blue-100 mb-8 max-w-md mx-auto">
            Upload any hiring CSV and receive a detailed bias report with 
            Gemini-powered explanations in seconds.
          </p>
          <Link 
            to="/upload" 
            className="inline-flex items-center gap-2 bg-white text-google-blue 
                       font-semibold px-8 py-4 rounded-full hover:bg-blue-50 
                       transition-colors shadow-lg"
          >
            Start Free Analysis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── METRIC CARD COMPONENT ───────────────────────────────────────
// A reusable card for each of the 3 bias metrics in the "How it works" section.
// Props (inputs) let us reuse the same card design with different content.
function MetricCard({ icon, iconBg, iconColor, accentColor, step, title, metric, formula, description }) {
  return (
    // 'border-l-4' = left border that's 4px thick (colored stripe on the left side)
    <div className={`card border-l-4 ${accentColor} p-6`}>
      
      {/* Step number + icon row */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-gray-100">{step}</span>
      </div>

      {/* Card text content */}
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{metric}</div>
      
      {/* Formula in a monospace code-style box */}
      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
        <code className="text-xs text-gray-600 font-mono">{formula}</code>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
