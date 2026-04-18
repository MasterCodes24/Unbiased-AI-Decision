// ============================================================
// MOCK_DATA.js — Simulates the JSON response from our FastAPI backend.
// In Phase 2, this will be replaced by a real fetch() call.
// This matches our Integration Schema exactly.
// ============================================================

export const MOCK_DATA = {
  // Overall fairness score out of 100 (higher = more fair)
  overall_score: 82,

  // Demographic Parity Difference: P(hired|female) - P(hired|male)
  // Range: -1 to +1. Values far from 0 indicate gender bias.
  // 14 means 14% gap — moderate concern (yellow zone)
  demographic_parity: 14,

  // Disparate Impact Ratio: P(hired|low_income) / P(hired|high_income)
  // The "80% rule": values below 80 are legally problematic.
  // 35 means 35% gap — HIGH concern (red zone)
  income_bias: 35,

  // Proxy Variables: columns that correlate with sensitive attributes
  // even if those sensitive columns were removed from the dataset
  proxy_variables: ['Zip Code', 'College Name', 'Commute Distance'],

  // AI Explanation: simulates a Gemini 1.5 Flash response
  ai_explanation: `The analysis of your hiring dataset reveals a moderately fair system with a composite FairLens score of 82/100, though two areas require your immediate attention before this model can be responsibly deployed in production.

The most critical finding is a significant income-based disparity. The Disparate Impact Ratio for low-income versus high-income candidates sits at 65% — well below the legally recognized 80% threshold established by the EEOC's "four-fifths rule." This means a low-income candidate is 35% less likely to advance through your pipeline than a comparable high-income candidate. Our proxy variable detection has likely identified the root cause: both 'Zip Code' and 'College Name' carry strong correlations (r > 0.3) with socioeconomic status, effectively re-introducing income bias even after the income column itself was excluded from the model.

On the gender dimension, a Demographic Parity Difference of 14% was detected, meaning female candidates are hired at a 14-percentage-point lower rate than male candidates. While this falls in the moderate concern range rather than the critical range, it crosses the 10% threshold where intervention is recommended. We suggest auditing the 'Commute Distance' feature, which shows a 0.41 correlation to gender in your dataset — likely a proxy for caregiving responsibilities. Removing or re-weighting this feature, combined with applying a fairness constraint during model retraining, is the recommended remediation path.`,
};

// ============================================================
// COLOR LOGIC — Used by the bias cards on the Results page.
// 
// For Gender Bias (Demographic Parity):
//   - GREEN if < 10  (minimal bias)
//   - YELLOW if 10–20 (moderate bias, investigate)
//   - RED if > 20    (significant bias, action required)
//
// For Income Bias (Disparate Impact):
//   - GREEN if < 10
//   - YELLOW if 10–20
//   - RED if > 20
// ============================================================
export function getBiasLevel(value) {
  if (value < 10) return 'green';
  if (value <= 20) return 'yellow';
  return 'red';
}

export function getBiasLabel(value) {
  if (value < 10) return 'Low Risk';
  if (value <= 20) return 'Moderate Risk';
  return 'High Risk';
}
