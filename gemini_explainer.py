import os
import json
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    api_key = api_key.strip()
    
client = genai.Client(api_key=api_key)

def get_fairness_explanation(bias_results: dict) -> str:
    """
    Takes bias metrics dict from calculate_all_metrics and returns Gemini explanation.
    """
    metrics_json_str = json.dumps(bias_results)

    prompt = f"""You are a fairness auditor. Given these hiring bias metrics: 
{metrics_json_str}

Write 3 short paragraphs for an HR team. 
Paragraph 1: What the numbers mean. 
Paragraph 2: Why this bias likely exists. 
Paragraph 3: Three concrete steps to fix it. 
Use simple language, no jargon."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Error communicating with Gemini API: {str(e)}"