from fastapi import FastAPI, UploadFile, File
import pandas as pd
from bias_calculator import calculate_all_metrics

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_data(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    results = calculate_all_metrics(df)
    return results