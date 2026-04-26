import pandas as pd
from backend.bias_calculator import calculate_all_metrics

def test_gender_bias():
    result = calculate_all_metrics(pd.DataFrame({"Gender":["m","m","f","f"],"Hired":[1,1,0,0]}))
    assert result["gender_bias"]["percentage"] == 100.0

def test_income_bias():
    result = calculate_all_metrics(pd.DataFrame({"Gender":["m","m","f","f"],"Income":["high","high","low","low"],"Hired":[1,1,0,1]}))
    assert result["income_bias"]["percentage"] == 50.0

def test_no_income():
    result = calculate_all_metrics(pd.DataFrame({"Gender":["m","f"],"Hired":[1,1]}))
    assert result["income_bias"]["percentage"] == 0.0

def test_proxy_detected():
    res = calculate_all_metrics(pd.DataFrame({"Gender":["m","m","f","f"],"Zip":[90210,90210,90001,90001],"Hired":[1,1,0,0]}))
    assert "Zip" in res["proxy_bias"]["proxy_variables"]

def test_proxy_clean():
    res = calculate_all_metrics(pd.DataFrame({"Gender":["m","f","m","f"],"Rand":[50,60,60,50],"Hired":[1,0,1,0]}))
    assert "Rand" not in res["proxy_bias"]["proxy_variables"]

def test_gender_encoding_variants():
    result = calculate_all_metrics(pd.DataFrame({
        "Gender": ["M", "m", "F", "f"],
        "Hired": [1, 1, 0, 0]
    }))
    assert result["gender_bias"]["percentage"] == 100.0
    
def test_gender_encoding_01():
    result = calculate_all_metrics(pd.DataFrame({
        "Gender": [1, 1, 0, 0],
        "Hired": [1, 1, 0, 0]
    }))
    assert result["gender_bias"]["percentage"] == 100.0

def test_missing_values_removed():
    result = calculate_all_metrics(pd.DataFrame({
        "Gender": ["m", "f", None, "f"],
        "Hired": [1, 0, 1, 1]
    }))
    assert result["data_quality"]["total_rows_removed"] == 1
    assert result["data_quality"]["final_dataset_size"] == 3  