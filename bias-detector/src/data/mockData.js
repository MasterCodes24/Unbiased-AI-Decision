// data/mockData.js — Utility functions only.
// The hardcoded MOCK_DATA has been removed.
// ResultsPage now uses real API data from the backend.

// ── BIAS LEVEL THRESHOLDS ────────────────────────────────────────
// Based on EEOC guidelines and common fairness standards:
//   < 10%  → Green  (Low Risk)
//   10–25% → Yellow (Moderate Risk)
//   25%+   → Red    (High Risk)

export function getBiasLevel(value) {
  if (value < 10) return 'green';
  if (value <= 25) return 'yellow';
  return 'red';
}

export function getBiasLabel(value) {
  if (value < 10) return 'Low Risk';
  if (value <= 25) return 'Moderate Risk';
  return 'High Risk';
}

// Returns a color string for the overall fairness score (inverted from bias)
// fairness = 100 - overall_bias_score
export function getScoreColor(fairnessScore) {
  if (fairnessScore >= 80) return '#34A853'; // Google Green
  if (fairnessScore >= 60) return '#FBBC05'; // Google Yellow
  return '#EA4335';                           // Google Red
}

export function getScoreLabel(fairnessScore) {
  if (fairnessScore >= 80) return 'Mostly Fair';
  if (fairnessScore >= 60) return 'Moderate Concern';
  return 'High Risk Model';
}
