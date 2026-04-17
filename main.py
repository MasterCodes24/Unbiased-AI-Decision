from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from bias_calculator import calculate_all_metrics
from gemini_explainer import generate_explanation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_data(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    
    df.columns = [col.strip() for col in df.columns]
    
    lower_cols = [col.lower() for col in df.columns]
    if "gender" not in lower_cols:
        raise HTTPException(status_code=400, detail="Missing required column: gender")
        
    if len(df) < 10:
        raise HTTPException(status_code=400, detail="Dataset too small for reliable analysis")
        
    hired_col = None
    for col in df.columns:
        if col.lower() == "hired":
            hired_col = col
            break
            
    if hired_col and df[hired_col].dtype == object:
        df[hired_col] = df[hired_col].astype(str).str.lower().str.strip()
        df[hired_col] = df[hired_col].map({'yes': 1, 'no': 0, 'y': 1, 'n': 0, 'true': 1, 'false': 0}).fillna(df[hired_col])
        df[hired_col] = pd.to_numeric(df[hired_col], errors='coerce').fillna(0)

    results = calculate_all_metrics(df)
    
    explanation = generate_explanation(results)
    results["explanation"] = explanation
    
    return results