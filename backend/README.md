# Unbiased AI Decision Platform

A tool to detect hiring bias in datasets by analyzing gender bias, income bias, and proxy variables that may discriminate unfairly.

## Setup

Install dependencies:
```bash
pip install fastapi uvicorn pandas numpy google-genai python-dotenv
```

Create `.env` file in project root:
```
GEMINI_API_KEY=your_api_key_here
```

Run the server:
```bash
uvicorn main:app --reload
```

Server runs at: `http://localhost:8000`

## API Endpoints

### GET /health
Checks if server is running.

Response:
```json
{"status": "ok"}
```

### POST /analyze
Upload a CSV file and get bias analysis results.

Request:
- File: CSV file with hiring data

Response:
```json
{
  "overall_bias_score": 35.53,
  "gender_bias": {
    "percentage": 10.0
  },
  "income_bias": {
    "percentage": 55.56,
    "interpretation": "Income bias: 55.56%"
  },
  "proxy_bias": {
    "proxy_variables": {"Zip_Code": 0.69},
    "max_correlation": 0.69
  },
  "data_quality": {
    "gender_removed": 2,
    "hired_removed": 1,
    "total_rows_removed": 3,
    "final_dataset_size": 97
  },
  "explanation": "3 paragraph explanation from Gemini..."
}
```

## CSV Requirements

Your CSV file must have these columns:

### Required Columns:
- `Gender` - Values: m, f, M, F, male, female, 0, 1, true, false
- `Hired` - Values: 0, 1, yes, no, true, false

### Optional Columns:
- `Income` - Values: high, low
- Any other numeric columns (used for proxy bias detection)

### Example CSV:
```
Gender,Age,Income,Hired
m,25,low,1
f,30,high,0
M,28,low,1
F,35,high,0
male,40,low,1
female,22,high,1
```

## Understanding the Metrics

### Overall Bias Score (0-100)
Single number showing total bias in hiring.
- 0-10: Low bias (good)
- 10-25: Moderate bias (concerning)
- 25+: High bias (serious problem)

### Gender Bias
Difference in hiring rate between males and females.
- Formula: |P(hired | female) - P(hired | male)| × 100
- Example: 20% means females are hired 20% less often than males

### Income Bias
Difference in hiring rate between low and high income applicants.
- Formula: Uses 80% rule from employment law
- Example: 50% means low-income people hired at 50% lower rate

### Proxy Bias
Other columns that secretly correlate with gender and might discriminate.
- Example: If zip code correlates 0.69 with gender, it's a red flag
- Flag threshold: Correlation > 0.3

### Data Quality
Shows how many rows were removed due to missing data.
- `gender_removed`: Rows with missing/invalid gender
- `hired_removed`: Rows with missing hired value
- `total_rows_removed`: Total rows removed
- `final_dataset_size`: Rows actually analyzed

## How to Use (Example)

1. Create test.csv:
```
Gender,Income,Hired
m,high,1
m,high,1
f,low,0
f,low,0
m,high,1
f,low,0
```

2. Upload to API:
```bash
curl -X POST "http://localhost:8000/analyze" \
  -F "file=@test.csv"
```

3. Get results with bias scores and explanation.

## Project Structure

- `main.py` - FastAPI server and /analyze endpoint
- `bias_calculator.py` - Bias metric calculations
- `gemini_explainer.py` - Gemini API integration for explanations
- `test_bias.py` - Unit tests
- `.env` - API keys (not committed to git)

## Testing

Run unit tests:
```bash
pytest test_bias.py -v
```

Expected: All 8 tests pass

## Features

- Handles 8 gender encoding variants (M/F, 0/1, true/false, etc.)
- Automatically removes rows with missing data
- Detects proxy variables that secretly discriminate
- Uses Gemini API to explain bias in simple language
- Provides transparency on data cleaning

## Known Limitations

- Only supports binary gender (male/female)
- Minimum 10 rows required in CSV
- Requires active Gemini API key

## Team

Built for GDG Solution Challenge 2026
