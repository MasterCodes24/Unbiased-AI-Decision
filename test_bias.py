import pandas as pd
from bias_calculator import calculate_all_metrics

def test_gender_bias_calculation():
    data = {
        "Gender": ["male", "male", "female", "female"],
        "Hired": [1, 1, 0, 0]
    }
    df = pd.DataFrame(data)
    results = calculate_all_metrics(df)
    assert results["gender_bias"]["percentage"] == 100.0

def test_income_bias_below_threshold():
    data = {
        "Gender": ["male", "male", "female", "female"],
        "Income": ["high", "high", "low", "low"],
        "Hired": [1, 1, 0, 1]
    }
    df = pd.DataFrame(data)
    results = calculate_all_metrics(df)
    assert results["income_bias"]["percentage"] == 50.0

def test_no_income_column():
    data = {
        "Gender": ["male", "female"],
        "Hired": [1, 1]
    }
    df = pd.DataFrame(data)
    results = calculate_all_metrics(df)
    assert results["income_bias"]["percentage"] == 0.0
    assert results["income_bias"]["interpretation"] == "Income data not provided."

def test_proxy_bias_detection():
    data = {
        "Gender": ["male", "male", "female", "female"],
        "Zip_Code": [90210, 90210, 90001, 90001],
        "Hired": [1, 1, 0, 0]
    }
    df = pd.DataFrame(data)
    results = calculate_all_metrics(df)
    assert "Zip_Code" in results["proxy_bias"]["proxy_variables"]
    assert results["proxy_bias"]["max_correlation"] > 0.3

def test_proxy_bias_no_correlation():
    data = {
        "Gender": ["male", "female", "male", "female"],
        # Varied the numbers so standard deviation is not 0
        # The values are distributed to have 0 correlation with Gender
        "Random_Score": [50, 60, 60, 50], 
        "Hired": [1, 0, 1, 0]
    }
    df = pd.DataFrame(data)
    results = calculate_all_metrics(df)
    assert "Random_Score" not in results["proxy_bias"]["proxy_variables"]