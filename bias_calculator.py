import pandas as pd
import numpy as np

def normalize_gender(df: pd.DataFrame) -> tuple:
    gender_col = None
    for col in df.columns:
        if col.lower() == 'gender':
            gender_col = col
            break
    
    if not gender_col:
        raise ValueError("Gender column not found")
    
    df_clean = df.copy()
    initial_rows = len(df_clean)
    
    df_clean = df_clean.dropna(subset=[gender_col])
    
    df_clean[gender_col] = df_clean[gender_col].astype(str).str.strip().str.lower()
    
    gender_mapping = {
        'm': 'male',
        'male': 'male',
        'man': 'male',
        'men': 'male',
        '1': 'male',
        'true': 'male',
        '0': 'female',
        'false': 'female',
        'f': 'female',
        'female': 'female',
        'woman': 'female',
        'women': 'female',
    }
    
    df_clean[gender_col] = df_clean[gender_col].map(gender_mapping)
    df_clean = df_clean.dropna(subset=[gender_col])
    
    rows_removed = initial_rows - len(df_clean)
    
    return df_clean, rows_removed, gender_col


def clean_dataset(df: pd.DataFrame) -> tuple:
    warnings = {}
    df_clean = df.copy()
    initial_rows = len(df_clean)
    
    df_clean, gender_removed, gender_col = normalize_gender(df_clean)
    if gender_removed > 0:
        warnings['gender_removed'] = gender_removed
    
    hired_col = None
    for col in df_clean.columns:
        if col.lower() == 'hired':
            hired_col = col
            break
    
    if hired_col:
        hired_removed_before = len(df_clean)
        df_clean = df_clean.dropna(subset=[hired_col])
        hired_removed = hired_removed_before - len(df_clean)
        
        if hired_removed > 0:
            warnings['hired_removed'] = hired_removed
    
    total_removed = initial_rows - len(df_clean)
    warnings['total_rows_removed'] = total_removed
    warnings['final_dataset_size'] = len(df_clean)
    
    return df_clean, warnings


def calculate_all_metrics(df: pd.DataFrame) -> dict:
    df_clean, data_warnings = clean_dataset(df)
    
    gender_col = None
    for col in df_clean.columns:
        if col.lower() == 'gender':
            gender_col = col
            break
    
    hired_col = None
    for col in df_clean.columns:
        if col.lower() == 'hired':
            hired_col = col
            break
    
    fem_p = df_clean[df_clean[gender_col] == 'female'][hired_col].mean()
    mal_p = df_clean[df_clean[gender_col] == 'male'][hired_col].mean()
    gen_pct = round(abs(fem_p - mal_p) * 100, 2)

    income_col = None
    for col in df_clean.columns:
        if col.lower() == 'income':
            income_col = col
            break
    
    if income_col:
        low_p = df_clean[df_clean[income_col].astype(str).str.lower() == 'low'][hired_col].mean()
        hi_p = df_clean[df_clean[income_col].astype(str).str.lower() == 'high'][hired_col].mean()
        dir_ratio = low_p / hi_p if hi_p > 0 else 1.0
        inc_pct = round((1 - dir_ratio) * 100, 2) if dir_ratio < 1 else 0.0
        inc_interp = f"Income bias: {inc_pct}%" if inc_pct > 0 else "No significant income bias."
    else:
        inc_pct, inc_interp = 0.0, "Income data not provided."

    df_num = df_clean.copy()
    df_num['Gender_Code'] = df_num[gender_col].astype('category').cat.codes
    proxy_vars, max_corr = {}, 0.0
    
    for col in df_num.select_dtypes(include=[np.number]).columns:
        if col not in [hired_col, 'Gender_Code']:
            corr = abs(df_num['Gender_Code'].corr(df_num[col]))
            if pd.notna(corr) and corr > 0.3:
                proxy_vars[col] = round(corr, 2)
                max_corr = max(max_corr, corr)

    ovr = round(min((0.5 * gen_pct) + (0.3 * inc_pct) + (0.2 * (max_corr * 100)), 100.0), 2)

    return {
        "overall_bias_score": ovr,
        "gender_bias": {"percentage": gen_pct},
        "income_bias": {"percentage": inc_pct, "interpretation": inc_interp},
        "proxy_bias": {"proxy_variables": proxy_vars, "max_correlation": round(max_corr, 2)},
        "data_quality": data_warnings
    }