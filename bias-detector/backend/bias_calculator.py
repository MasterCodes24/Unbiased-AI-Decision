import pandas as pd
import numpy as np


# ── PROTECTED ATTRIBUTE NORMALISER ──────────────────────────────────
_BINARY_MAP: dict = {
    'm': 'group_a', 'male': 'group_a', 'man': 'group_a', 'men': 'group_a',
    '1': 'group_a', 'true': 'group_a',
    'f': 'group_b', 'female': 'group_b', 'woman': 'group_b', 'women': 'group_b',
    '0': 'group_b', 'false': 'group_b',
    'white': 'group_a', 'non-white': 'group_b',
    'majority': 'group_a', 'minority': 'group_b',
    'yes': 'group_a', 'no': 'group_b',
    'y': 'group_a', 'n': 'group_b',
}


def _normalise_protected(series: pd.Series) -> pd.Series:
    s = series.astype(str).str.strip().str.lower()
    mapped = s.map(_BINARY_MAP)
    fallback = s.where(mapped.isna(), mapped)
    return fallback


def _normalise_target(series: pd.Series) -> pd.Series:
    text_map = {
        'yes': 1, 'y': 1, 'true': 1, '1': 1,
        'no': 0, 'n': 0, 'false': 0, '0': 0,
        'approved': 1, 'rejected': 0,
        'accept': 1, 'reject': 0,
        'hired': 1, 'not hired': 0,
        'pass': 1, 'fail': 0,
    }
    if series.dtype == object:
        return series.astype(str).str.lower().str.strip().map(text_map)
    return pd.to_numeric(series, errors='coerce')


def clean_dataset(df, protected_col="gender", target_col="hired"):
    warnings = {}
    df_clean = df.copy()
    initial_rows = len(df_clean)

    if protected_col not in df_clean.columns:
        raise ValueError(f"Protected-attribute column '{protected_col}' not found.")
    df_clean[protected_col] = _normalise_protected(df_clean[protected_col])
    before = len(df_clean)
    df_clean = df_clean.dropna(subset=[protected_col])
    prot_removed = before - len(df_clean)
    if prot_removed:
        warnings['protected_removed'] = prot_removed

    if target_col not in df_clean.columns:
        raise ValueError(f"Target column '{target_col}' not found.")
    df_clean[target_col] = _normalise_target(df_clean[target_col])
    before2 = len(df_clean)
    df_clean = df_clean.dropna(subset=[target_col])
    df_clean[target_col] = df_clean[target_col].astype(float)
    target_removed = before2 - len(df_clean)
    if target_removed:
        warnings['target_removed'] = target_removed

    warnings['total_rows_removed'] = initial_rows - len(df_clean)
    warnings['final_dataset_size'] = len(df_clean)
    return df_clean, warnings


def calculate_all_metrics(df, protected_col="gender", target_col="hired",
                           income_col=None, threshold=None):
    df_clean, data_warnings = clean_dataset(df, protected_col, target_col)

    if threshold is not None:
        df_clean[target_col] = (df_clean[target_col] >= threshold).astype(float)

    groups = df_clean[protected_col].unique()
    if len(groups) < 2:
        raise ValueError(f"Protected attribute needs >= 2 distinct values. Found: {list(groups)}")

    if 'group_a' in groups and 'group_b' in groups:
        ga, gb = 'group_a', 'group_b'
    else:
        sorted_groups = sorted([str(g) for g in groups])
        ga, gb = sorted_groups[0], sorted_groups[1]

    rate_a = df_clean[df_clean[protected_col] == ga][target_col].mean()
    rate_b = df_clean[df_clean[protected_col] == gb][target_col].mean()
    gen_pct = round(abs(rate_a - rate_b) * 100, 2)

    inc_pct, inc_interp = 0.0, "No secondary attribute column provided."
    if income_col and income_col in df_clean.columns:
        vals = df_clean[income_col].astype(str).str.lower().str.strip().unique()
        low_labels = {'low', '0', 'false', 'no', 'minority', 'group_b'}
        high_labels = {'high', '1', 'true', 'yes', 'majority', 'group_a'}
        found_low  = next((v for v in vals if v in low_labels), None)
        found_high = next((v for v in vals if v in high_labels), None)
        if found_low and found_high:
            low_p = df_clean[df_clean[income_col].astype(str).str.lower().str.strip() == found_low][target_col].mean()
            hi_p  = df_clean[df_clean[income_col].astype(str).str.lower().str.strip() == found_high][target_col].mean()
            dir_ratio = low_p / hi_p if hi_p and hi_p > 0 else 1.0
            inc_pct  = round((1 - dir_ratio) * 100, 2) if dir_ratio < 1 else 0.0
            inc_interp = f"Socioeconomic bias: {inc_pct}%" if inc_pct > 0 else "No significant socioeconomic bias."
        else:
            inc_interp = "Could not identify high/low groups in this column."

    df_num = df_clean.copy()
    df_num['_prot_code'] = df_num[protected_col].astype('category').cat.codes
    proxy_vars = {}
    max_corr = 0.0

    for col in df_num.select_dtypes(include=[np.number]).columns:
        if col in (target_col, '_prot_code'):
            continue
        corr = abs(df_num['_prot_code'].corr(df_num[col]))
        if pd.notna(corr) and corr > 0.3:
            proxy_vars[col] = round(float(corr), 2)
            max_corr = max(max_corr, corr)

    ovr = round(min((0.5 * gen_pct) + (0.3 * inc_pct) + (0.2 * (max_corr * 100)), 100.0), 2)

    return {
        "overall_bias_score": ovr,
        "gender_bias": {
            "percentage": gen_pct,
            "group_a_label": ga,
            "group_b_label": gb,
            "rate_a": round(float(rate_a), 4),
            "rate_b": round(float(rate_b), 4),
        },
        "income_bias": {"percentage": inc_pct, "interpretation": inc_interp},
        "proxy_bias": {"proxy_variables": proxy_vars, "max_correlation": round(float(max_corr), 2)},
        "data_quality": data_warnings,
    }


def simulate_threshold(df, protected_col, target_col, threshold, income_col=None):
    df_clean, _ = clean_dataset(df, protected_col, target_col)
    df_clean[target_col] = (df_clean[target_col] >= threshold).astype(float)

    groups = df_clean[protected_col].unique()
    if len(groups) < 2:
        raise ValueError("Need at least 2 groups.")

    if 'group_a' in groups and 'group_b' in groups:
        ga, gb = 'group_a', 'group_b'
    else:
        sorted_groups = sorted([str(g) for g in groups])
        ga, gb = sorted_groups[0], sorted_groups[1]

    rate_a = df_clean[df_clean[protected_col] == ga][target_col].mean()
    rate_b = df_clean[df_clean[protected_col] == gb][target_col].mean()
    gen_pct = round(abs(rate_a - rate_b) * 100, 2)

    inc_pct = 0.0
    if income_col and income_col in df_clean.columns:
        vals = df_clean[income_col].astype(str).str.lower().str.strip().unique()
        low_labels = {'low', '0', 'false', 'no', 'minority', 'group_b'}
        high_labels = {'high', '1', 'true', 'yes', 'majority', 'group_a'}
        found_low  = next((v for v in vals if v in low_labels), None)
        found_high = next((v for v in vals if v in high_labels), None)
        if found_low and found_high:
            low_p = df_clean[df_clean[income_col].astype(str).str.lower().str.strip() == found_low][target_col].mean()
            hi_p  = df_clean[df_clean[income_col].astype(str).str.lower().str.strip() == found_high][target_col].mean()
            dir_ratio = low_p / hi_p if hi_p and hi_p > 0 else 1.0
            inc_pct   = round((1 - dir_ratio) * 100, 2) if dir_ratio < 1 else 0.0

    ovr = round(min((0.5 * gen_pct) + (0.3 * inc_pct), 100.0), 2)
    total = len(df_clean)
    accepted = int(df_clean[target_col].sum())

    return {
        "threshold": threshold,
        "overall_bias_score": ovr,
        "gender_bias_pct": gen_pct,
        "income_bias_pct": inc_pct,
        "acceptance_rate": round(accepted / total * 100, 2) if total else 0,
        "group_a_rate": round(float(rate_a) * 100, 2),
        "group_b_rate": round(float(rate_b) * 100, 2),
        "group_a_label": ga,
        "group_b_label": gb,
    }
