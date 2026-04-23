from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import io
import json
from typing import Any, Optional
from bias_calculator import calculate_all_metrics, simulate_threshold
from gemini_explainer import get_fairness_explanation
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FairLens Bias Detection API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HEALTH ───────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FairLens Bias Detection API v2"}


# ── COLUMN PREVIEW ───────────────────────────────────────────────────
@app.post("/preview-columns")
async def preview_columns(file: UploadFile = File(...)):
    """Returns just the column headers + first 3 rows so the frontend
    can render the Column Mapper without a full analysis."""
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), nrows=3)
        df.columns = [c.strip() for c in df.columns]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    return {
        "columns": list(df.columns),
        "sample": df.fillna("N/A").to_dict(orient="records"),
        "total_columns": len(df.columns),
    }


# ── MAIN ANALYSIS ENDPOINT ────────────────────────────────────────────
@app.post("/analyze")
async def analyze_data(
    file: UploadFile = File(...),
    column_map: str = Form("{}"),
):
    """
    Accepts a CSV + JSON column_map string.
    column_map shape: {
      "protected_attr": "<col name>",
      "target_col": "<col name>",
      "income_col": "<col name | null>"
    }
    """
    # Parse column_map
    try:
        col_map: dict = json.loads(column_map)
    except Exception:
        col_map = {}

    protected_col = col_map.get("protected_attr", "gender")
    target_col    = col_map.get("target_col", "hired")
    income_col    = col_map.get("income_col") or None

    # Read CSV
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV file: {str(e)}")

    df.columns = [c.strip() for c in df.columns]
    lower_cols  = [c.lower() for c in df.columns]

    # ── VALIDATION ───────────────────────────────────────────────────
    if protected_col not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{protected_col}' not found. Available columns: {list(df.columns)}"
        )
    if target_col not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Column '{target_col}' not found. Available columns: {list(df.columns)}"
        )
    if len(df) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset too small: {len(df)} rows. Minimum 10 rows required."
        )

    # ── NORMALISE TARGET COLUMN ───────────────────────────────────────
    if df[target_col].dtype == object:
        text_map = {'yes':1,'y':1,'true':1,'1':1,'no':0,'n':0,'false':0,'0':0,
                    'approved':1,'rejected':0,'accept':1,'reject':0,'hired':1,'pass':1,'fail':0}
        df[target_col] = (
            df[target_col].astype(str).str.lower().str.strip().map(text_map).fillna(pd.NA)
        )
    df[target_col] = pd.to_numeric(df[target_col], errors='coerce')

    # ── BUILD PREVIEW ─────────────────────────────────────────────────
    priority_cols = [c for c in df.columns
                     if c.lower() in [protected_col.lower(), target_col.lower(),
                                       'income', 'age', 'zip_code', 'experience_years']]
    if not priority_cols:
        priority_cols = list(df.columns[:6])
    preview = df[priority_cols].head(5).fillna('N/A').to_dict(orient='records')

    # ── BIAS CALCULATION ──────────────────────────────────────────────
    try:
        results = calculate_all_metrics(
            df,
            protected_col=protected_col,
            target_col=target_col,
            income_col=income_col,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias calculation error: {str(e)}")

    # ── GEMINI EXPLANATION ────────────────────────────────────────────
    try:
        results["explanation"] = get_fairness_explanation(results)
    except Exception as e:
        results["explanation"] = (
            f"Gemini explanation unavailable: {str(e)}. "
            "The bias metrics above are still accurate."
        )

    results["preview"]       = preview
    results["column_map"]    = {"protected_attr": protected_col,
                                 "target_col": target_col,
                                 "income_col": income_col}

    return results


# ── WHAT-IF SIMULATION ENDPOINT ───────────────────────────────────────
class SimulateRequest(BaseModel):
    results: dict[str, Any]          # full results from /analyze (contains raw data shape)
    file_name: str = "dataset.csv"


@app.post("/simulate")
async def simulate_bias(
    file: UploadFile = File(...),
    column_map: str = Form("{}"),
    thresholds: str = Form("[0.5]"),
):
    """
    Given the original CSV and a list of thresholds, returns bias metrics
    at each threshold — used by the What-If Simulator in the frontend.

    thresholds: JSON array, e.g. "[0.1, 0.3, 0.5, 0.7, 0.9]"
    """
    try:
        col_map: dict = json.loads(column_map)
    except Exception:
        col_map = {}

    try:
        threshold_list: list = json.loads(thresholds)
    except Exception:
        threshold_list = [0.5]

    protected_col = col_map.get("protected_attr", "gender")
    target_col    = col_map.get("target_col", "hired")
    income_col    = col_map.get("income_col") or None

    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        df.columns = [c.strip() for c in df.columns]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    # Normalise target
    if df[target_col].dtype == object:
        text_map = {'yes':1,'y':1,'true':1,'1':1,'no':0,'n':0,'false':0,'0':0,
                    'approved':1,'rejected':0,'accept':1,'reject':0,'hired':1,'pass':1,'fail':0}
        df[target_col] = df[target_col].astype(str).str.lower().str.strip().map(text_map).fillna(pd.NA)
    df[target_col] = pd.to_numeric(df[target_col], errors='coerce')

    sim_results = []
    for t in threshold_list:
        try:
            r = simulate_threshold(df, protected_col, target_col, float(t), income_col)
            sim_results.append(r)
        except Exception as e:
            sim_results.append({"threshold": t, "error": str(e)})

    return {"simulations": sim_results}


# ── PDF EXPORT ────────────────────────────────────────────────────────
class PDFRequest(BaseModel):
    results: dict[str, Any]
    file_name: str = "dataset.csv"


@app.post("/export-pdf")
def export_pdf(req: PDFRequest):
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                         Table, TableStyle, HRFlowable)
        from reportlab.lib.enums import TA_CENTER
        from datetime import datetime
    except ImportError:
        raise HTTPException(status_code=501,
            detail="PDF generation requires reportlab. Install: pip install reportlab")

    results   = req.results
    file_name = req.file_name

    overall_bias   = results.get("overall_bias_score", 0)
    fairness_score = max(0, round(100 - overall_bias))
    gender_pct     = results.get("gender_bias", {}).get("percentage", 0)
    income_pct     = results.get("income_bias", {}).get("percentage", 0)
    proxy_vars     = results.get("proxy_bias", {}).get("proxy_variables", {})
    data_quality   = results.get("data_quality", {})
    explanation    = results.get("explanation", "No explanation available.")
    col_map        = results.get("column_map", {})
    generated_at   = datetime.now().strftime("%B %d, %Y at %H:%M")

    def bias_status(v):
        if v < 10:  return "✓ Low Risk"
        if v <= 25: return "⚠ Moderate"
        return "✗ High Risk"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=2*cm, leftMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    h1   = ParagraphStyle('H1', parent=styles['Heading1'],  fontSize=22, textColor=colors.HexColor('#1a73e8'), spaceAfter=6)
    h2   = ParagraphStyle('H2', parent=styles['Heading2'],  fontSize=14, textColor=colors.HexColor('#202124'), spaceAfter=4)
    body = ParagraphStyle('Body',parent=styles['Normal'],   fontSize=10, leading=15, spaceAfter=6)
    sml  = ParagraphStyle('Sml', parent=styles['Normal'],   fontSize=8,  textColor=colors.HexColor('#666'),    spaceAfter=4)

    story.append(Paragraph("FairLens — AI Hiring Bias Report", h1))
    story.append(Paragraph(
        f"File: <b>{file_name}</b> &nbsp;|&nbsp; Generated: {generated_at} &nbsp;|&nbsp; "
        f"Protected: <b>{col_map.get('protected_attr','—')}</b> → Target: <b>{col_map.get('target_col','—')}</b>",
        sml))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceAfter=12))

    score_color = '#137333' if fairness_score >= 80 else ('#7d5a00' if fairness_score >= 60 else '#c5221f')
    score_label = 'Mostly Fair' if fairness_score >= 80 else ('Moderate Concern' if fairness_score >= 60 else 'High Risk')
    story.append(Paragraph("Overall Fairness Score", h2))
    story.append(Paragraph(
        f'<font size="28" color="{score_color}"><b>{fairness_score}</b></font>'
        f'<font size="14" color="#666"> / 100 — {score_label}</font>',
        ParagraphStyle('Sc', parent=styles['Normal'], fontSize=28, spaceAfter=8)))
    story.append(Paragraph(
        f"Bias score: {overall_bias:.1f}/100 | Dataset: {data_quality.get('final_dataset_size','—')} rows", sml))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Bias Metrics Summary", h2))
    metrics_data = [
        ['Metric', 'Value', 'Status', 'Threshold'],
        ['Protected-Attr Bias (Demographic Parity)', f'{gender_pct:.1f}%', bias_status(gender_pct), '< 10%'],
        ['Secondary Attr Bias (Disparate Impact)',   f'{income_pct:.1f}%', bias_status(income_pct), '< 10%'],
        ['Proxy Variables Detected', str(len(proxy_vars)), '⚠ Review' if proxy_vars else '✓ Clean', '|r| < 0.3'],
    ]
    tbl = Table(metrics_data, colWidths=[7*cm, 2.5*cm, 3.5*cm, 4*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#1a73e8')),
        ('TEXTCOLOR',(0,0),(-1,0),colors.white),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f8f9fa'),colors.white]),
        ('GRID',(0,0),(-1,-1),0.25,colors.HexColor('#e0e0e0')),
        ('ALIGN',(1,0),(-1,-1),'CENTER'),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('TOPPADDING',(0,0),(-1,-1),6),
        ('BOTTOMPADDING',(0,0),(-1,-1),6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 12))

    if data_quality.get('total_rows_removed', 0) > 0:
        story.append(Paragraph("Data Quality Notes", h2))
        story.append(Paragraph(
            f"• Total rows removed: {data_quality.get('total_rows_removed',0)}<br/>"
            f"• Protected attr invalid: {data_quality.get('protected_removed',0)}<br/>"
            f"• Target value missing: {data_quality.get('target_removed',0)}<br/>"
            f"• Final dataset size: {data_quality.get('final_dataset_size','—')} rows", body))
        story.append(Spacer(1, 8))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=4, spaceAfter=8))
    story.append(Paragraph("Gemini AI Analysis", h2))
    for para in explanation.split('\n\n'):
        if para.strip():
            safe = para.strip().replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
            story.append(Paragraph(safe, body))

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e0e0e0')))
    story.append(Paragraph(
        "Generated by FairLens · GDG Solution Challenge 2026 · Powered by Gemini AI",
        ParagraphStyle('Ft', parent=styles['Normal'], fontSize=7,
                       textColor=colors.HexColor('#999'), alignment=TA_CENTER)))

    doc.build(story)
    buffer.seek(0)
    safe_name = file_name.replace('.csv','').replace(' ','_')
    return StreamingResponse(buffer, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="FairLens_Report_{safe_name}.pdf"'})
