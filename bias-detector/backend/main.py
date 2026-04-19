from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import io
from typing import Any
from bias_calculator import calculate_all_metrics
from gemini_explainer import get_fairness_explanation
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FairLens Bias Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # In production: restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HEALTH CHECK ────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FairLens Bias Detection API"}


# ── MAIN ANALYSIS ENDPOINT ──────────────────────────────────────────
@app.post("/analyze")
async def analyze_data(file: UploadFile = File(...)):
    """
    Accepts a CSV file, runs bias analysis, calls Gemini for explanation.
    Returns: overall_bias_score, gender_bias, income_bias, proxy_bias,
             data_quality, explanation, preview (first 5 rows).
    """
    # Read CSV
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV file: {str(e)}")

    # Strip whitespace from column names
    df.columns = [c.strip() for c in df.columns]
    lower_cols = [c.lower() for c in df.columns]

    # ── VALIDATION ──────────────────────────────────────────────────
    if "gender" not in lower_cols:
        raise HTTPException(
            status_code=400,
            detail="Missing required column: 'Gender'. Your CSV must have a Gender column."
        )

    if len(df) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset too small: only {len(df)} rows found. Minimum 10 rows required for reliable analysis."
        )

    # ── NORMALIZE HIRED COLUMN ──────────────────────────────────────
    hired_col = next((c for c in df.columns if c.lower() == "hired"), None)

    if hired_col:
        # Normalize text → numeric: yes/no/true/false → 1/0
        if df[hired_col].dtype == object:
            df[hired_col] = (
                df[hired_col]
                .astype(str)
                .str.lower()
                .str.strip()
                .map({'yes': 1, 'no': 0, 'y': 1, 'n': 0, 'true': 1, 'false': 0, '1': 1, '0': 0})
                .fillna(pd.NA)
            )
        df[hired_col] = pd.to_numeric(df[hired_col], errors='coerce')
    else:
        raise HTTPException(
            status_code=400,
            detail="Missing required column: 'Hired'. Your CSV must have a Hired column (values: 0/1, yes/no)."
        )

    # ── PHASE 3: BUILD PREVIEW (first 5 rows of raw data) ───────────
    # We take the preview BEFORE cleaning so users see their original data
    preview_cols = [c for c in df.columns if c.lower() in ['gender', 'hired', 'income', 'age', 'zip_code', 'experience_years']]
    if not preview_cols:
        preview_cols = list(df.columns[:6])   # Fallback: first 6 columns
    preview = df[preview_cols].head(5).fillna('N/A').to_dict(orient='records')

    # ── BIAS CALCULATION ────────────────────────────────────────────
    try:
        results = calculate_all_metrics(df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bias calculation error: {str(e)}")

    # ── GEMINI EXPLANATION ──────────────────────────────────────────
    try:
        results["explanation"] = get_fairness_explanation(results)
    except Exception as e:
        # Don't fail the whole request if Gemini is unavailable
        results["explanation"] = (
            f"Gemini explanation unavailable: {str(e)}. "
            "The bias metrics above are still accurate and based on your dataset."
        )

    # ── ADD PREVIEW TO RESPONSE ─────────────────────────────────────
    results["preview"] = preview

    return results


# ── PHASE 3: PDF EXPORT ENDPOINT ────────────────────────────────────
class PDFRequest(BaseModel):
    results: dict[str, Any]
    file_name: str = "dataset.csv"


@app.post("/export-pdf")
def export_pdf(req: PDFRequest):
    """
    Phase 3: Generates a professional PDF bias report.
    Accepts the bias results JSON and returns a PDF file as a streaming response.

    Requires: pip install reportlab
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from datetime import datetime
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF generation requires reportlab. Install it: pip install reportlab"
        )

    results = req.results
    file_name = req.file_name

    # ── EXTRACT METRICS ──────────────────────────────────────────────
    overall_bias = results.get("overall_bias_score", 0)
    fairness_score = max(0, round(100 - overall_bias))
    gender_pct = results.get("gender_bias", {}).get("percentage", 0)
    income_pct = results.get("income_bias", {}).get("percentage", 0)
    proxy_vars = results.get("proxy_bias", {}).get("proxy_variables", {})
    data_quality = results.get("data_quality", {})
    explanation = results.get("explanation", "No explanation available.")
    generated_at = datetime.now().strftime("%B %d, %Y at %H:%M")

    def bias_status(value, low=10, high=25):
        if value < low:  return "✓ Low Risk"
        if value <= high: return "⚠ Moderate Risk"
        return "✗ High Risk"

    # ── PDF BUILDER ──────────────────────────────────────────────────
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()
    story = []

    # Styles
    h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor('#1a73e8'), spaceAfter=6)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#202124'), spaceAfter=4)
    body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=15, spaceAfter=6)
    small = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#666'), spaceAfter=4)
    badge_green = ParagraphStyle('BadgeG', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#137333'))
    badge_yellow = ParagraphStyle('BadgeY', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#7d5a00'))
    badge_red = ParagraphStyle('BadgeR', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#c5221f'))

    # Header
    story.append(Paragraph("FairLens — AI Hiring Bias Report", h1))
    story.append(Paragraph(f"File: <b>{file_name}</b> &nbsp;|&nbsp; Generated: {generated_at}", small))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceAfter=12))

    # Overall Score
    story.append(Paragraph("Overall Fairness Score", h2))
    score_color = '#137333' if fairness_score >= 80 else ('#7d5a00' if fairness_score >= 60 else '#c5221f')
    score_label = 'Mostly Fair' if fairness_score >= 80 else ('Moderate Concern' if fairness_score >= 60 else 'High Risk')
    story.append(Paragraph(
        f'<font size="28" color="{score_color}"><b>{fairness_score}</b></font>'
        f'<font size="14" color="#666"> / 100 — {score_label}</font>',
        ParagraphStyle('Score', parent=styles['Normal'], fontSize=28, spaceAfter=8)
    ))
    story.append(Paragraph(
        f"Bias score: {overall_bias:.1f}/100 &nbsp;|&nbsp; Dataset: {data_quality.get('final_dataset_size','—')} rows analyzed",
        small
    ))
    story.append(Spacer(1, 12))

    # Metrics Table
    story.append(Paragraph("Bias Metrics Summary", h2))

    def status_style(value, low=10, high=25):
        if value < low:  return badge_green
        if value <= high: return badge_yellow
        return badge_red

    metrics_data = [
        ['Metric', 'Value', 'Status', 'Threshold'],
        ['Gender Bias (Demographic Parity)', f'{gender_pct:.1f}%', bias_status(gender_pct), '< 10% (Low Risk)'],
        ['Income Bias (Disparate Impact)', f'{income_pct:.1f}%', bias_status(income_pct), '< 10% (Low Risk)'],
        ['Proxy Variables Detected', str(len(proxy_vars)), '⚠ Review' if proxy_vars else '✓ Clean', '|r| < 0.3'],
    ]

    tbl = Table(metrics_data, colWidths=[7*cm, 2.5*cm, 3.5*cm, 4*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a73e8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#f8f9fa'), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e0e0e0')),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 12))

    # Proxy Variables Detail
    if proxy_vars:
        story.append(Paragraph("Proxy Variables Detail", h2))
        proxy_data = [['Column', 'Correlation with Gender', 'Risk Level']]
        for col, corr in proxy_vars.items():
            risk = 'High' if corr > 0.6 else ('Moderate' if corr > 0.4 else 'Low-Moderate')
            proxy_data.append([col, f'{corr:.3f}', risk])
        ptbl = Table(proxy_data, colWidths=[7*cm, 5*cm, 5*cm])
        ptbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f29900')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fffde7'), colors.white]),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#e0e0e0')),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(ptbl)
        story.append(Spacer(1, 12))

    # Data Quality
    if data_quality.get('total_rows_removed', 0) > 0:
        story.append(Paragraph("Data Quality Notes", h2))
        story.append(Paragraph(
            f"• Total rows removed: {data_quality.get('total_rows_removed', 0)}<br/>"
            f"• Invalid gender values removed: {data_quality.get('gender_removed', 0)}<br/>"
            f"• Missing hired values removed: {data_quality.get('hired_removed', 0)}<br/>"
            f"• Final dataset size: {data_quality.get('final_dataset_size', '—')} rows",
            body
        ))
        story.append(Spacer(1, 8))

    # Gemini Explanation
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=4, spaceAfter=8))
    story.append(Paragraph("Gemini AI Analysis", h2))
    for para in explanation.split('\n\n'):
        if para.strip():
            # Sanitize for reportlab XML
            safe = para.strip().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(safe, body))

    # Footer
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e0e0e0')))
    story.append(Paragraph(
        "Generated by FairLens · GDG Solution Challenge 2026 · "
        "Powered by Gemini AI + Google Cloud Run",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=7,
                       textColor=colors.HexColor('#999'), alignment=TA_CENTER)
    ))

    # Build PDF
    doc.build(story)
    buffer.seek(0)

    safe_name = file_name.replace('.csv', '').replace(' ', '_')
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="FairLens_Report_{safe_name}.pdf"'
        }
    )
