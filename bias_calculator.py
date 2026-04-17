import pandas as pd
import numpy as np

def calculate_all_metrics(df: pd.DataFrame) -> dict:
    female_hired_prob = df[df['Gender'].str.lower() == 'female']['Hired'].mean()
    male_hired_prob = df[df['Gender'].str.lower() == 'male']['Hired'].mean()
    
    dpd = abs(female_hired_prob - male_hired_prob)
    gender_bias_pct = round(dpd * 100, 2)

    if 'Income' in df.columns:
        low_income_prob = df[df['Income'].str.lower() == 'low']['Hired'].mean()
        high_income_prob = df[df['Income'].str.lower() == 'high']['Hired'].mean()
        
        dir_ratio = low_income_prob / high_income_prob if high_income_prob > 0 else 1.0
        
        if dir_ratio < 1:
            income_bias_pct = round((1 - dir_ratio) * 100, 2)
            income_interp = f"Income bias: {income_bias_pct}% — low-income applicants are hired at {income_bias_pct}% lower rate"
        else:
            income_bias_pct = 0.0
            income_interp = "No significant income bias."
    else:
        dir_ratio = 1.0
        income_bias_pct = 0.0
        income_interp = "Income data not provided."

    df_numeric = df.copy()
    df_numeric['Gender_Code'] = df_numeric['Gender'].astype('category').cat.codes
    
    numeric_cols = df_numeric.select_dtypes(include=[np.number]).columns
    
    proxy_vars = []
    max_corr = 0.0
    
    for col in numeric_cols:
        if col not in ['Hired', 'Gender_Code']:
            corr = abs(df_numeric['Gender_Code'].corr(df_numeric[col]))
            if not pd.isna(corr):
                if corr > 0.3:
                    proxy_vars.append(col)
                if corr > max_corr:
                    max_corr = corr

    return {
        "gender_bias": {
            "metric_name": "Demographic Parity Difference",
            "percentage": gender_bias_pct,
            "interpretation": f"{gender_bias_pct}% disparity in hiring rate between genders"
        },
        "income_bias": {
            "metric_name": "Disparate Impact Ratio",
            "percentage": income_bias_pct,
            "interpretation": income_interp
        },
        "proxy_bias": {
            "proxy_variables": proxy_vars,
            "max_correlation": round(max_corr, 2)
        }
    }