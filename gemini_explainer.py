import os
import json
from google import genai
from dotenv import load_dotenv

# Load the API key from your .env file
load_dotenv()

# Initialize the client. Make sure GEMINI_API_KEY is clean in your .env
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    api_key = api_key.strip()
    
client = genai.Client(api_key=api_key)

def get_fairness_explanation(bias_metrics: dict) -> str:
    """
    Takes a dictionary of bias metrics, builds the HR prompt, 
    and returns a plain-English explanation from Gemini Flash.
    """
    # Convert the Python dictionary back to a JSON string for the prompt
    metrics_json_str = json.dumps(bias_metrics)

    # The exact prompt template requested
    prompt = f"""You are a fairness auditor. Given these hiring bias metrics: 
{metrics_json_str}

Write 3 short paragraphs for an HR team. 
Paragraph 1: What the numbers mean. 
Paragraph 2: Why this bias likely exists. 
Paragraph 3: Three concrete steps to fix it. 
Use simple language, no jargon."""

    try:
        # Call the Gemini 1.5 Flash model
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini API: {str(e)}"

# ==========================================
# Local Testing Block
# This only runs if you execute this file directly
# ==========================================
if __name__ == "__main__":
    print("--- Testing Gemini Explainer Module ---")
    
    # The sample JSON bias results provided
    sample_bias_data = {
        "overall_bias_score": 35.53,
        "gender_bias": {
            "metric_name": "Demographic Parity Difference",
            "percentage": 10.0,
            "interpretation": "10.0% disparity in hiring rate between genders"
        },
        "income_bias": {
            "metric_name": "Disparate Impact Ratio",
            "percentage": 55.56,
            "interpretation": "Income bias: 55.56% — low-income applicants are hired at 55.56% lower rate"
        },
        "proxy_bias": {
            "proxy_variables": {"Zip_Code": 0.69},
            "max_correlation": 0.69
        },
        "explanation": "This is a placeholder explanation. Once Member 3 connects the Gemini API, this will contain the 3-paragraph fairness audit regarding the numbers above."
    }

    print("Sending data to Gemini...")
    explanation = get_fairness_explanation(sample_bias_data)
    
    print("\n=== GEMINI RESPONSE ===\n")
    print(explanation)
    print("\n=======================")