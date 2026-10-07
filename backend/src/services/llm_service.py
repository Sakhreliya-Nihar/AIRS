import re, json
from google import genai
from google.genai.types import GenerateContentConfig, SafetySetting, HarmCategory, HarmBlockThreshold
from openai import OpenAI


def analyze_logs_with_llm(provider: str, api_key: str, persona_instruction: str, combined_text: str):
    if not api_key:
        raise ValueError(f"API Key for {provider.upper()} is missing. Please add it in Settings.")

    # NEW: Calculate count to force compliance
    log_entries = combined_text.strip().split('\n')
    expected_count = len(log_entries)
    
    full_prompt = f"""
            {persona_instruction}

            LOGS:
            {combined_text}
            
            CRITICAL INSTRUCTIONS:
            1. There are exactly {expected_count} log entries above.
            2. You MUST return a JSON list containing exactly {expected_count} objects.
            3. Each object MUST correspond to one of the unique IDs provided in the logs.
            4. DO NOT skip any IDs. If a log is low risk, still provide a response with a risk_score of 1.
            5. Return ONLY the JSON list. No conversational text.

            [
                {{ 
                    "event_id": "the_original_id",
                    "analysis": {{
                        "incident_overview": "A thorough, detailed explanation of exactly what happened.",
                        "business_impact": "The real-world consequence of this event (e.g., downtime, data breach, none).",
                        "technical_root_cause": "The specific technical mechanism, vulnerability, or error that triggered this."
                    }},
                    "mitigation_plan": [
                        {{
                            "step_number": 1,
                            "action_title": "A clear, concise title for this step.",
                            "who_should_execute": "Specify who should do this (e.g., 'Business Owner', 'External IT Provider', 'Network Engineer').",
                            "detailed_instructions": "Exact, step-by-step instructions. For IT/SOC, include specific CLI commands. For Business Owners, include exactly what to tell their IT team.",
                            "why_this_is_necessary": "A deep explanation of what this specific action achieves and the risk of NOT doing it."
                        }}
                    ],
                    "risk_assessment": {{
                        "score": <integer between 1 and 10>,
                        "severity": "<Critical, High, Medium, or Low>",
                        "justification": "A detailed reason why this specific score and severity were assigned based on the log evidence."
                    }}
                }}
            ]
            """

    if provider.lower() == "openai" or provider.lower() == "chatgpt":
        return _analyze_openai(api_key, full_prompt)
    else:
        return _analyze_gemini(api_key, full_prompt)


def _analyze_gemini(api_key: str, full_prompt: str):
    client = genai.Client(api_key=api_key)
    
    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        config=GenerateContentConfig(
            safety_settings=[
                SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
                SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_NONE),
                SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_NONE),
                SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
            ],
            response_mime_type="application/json"
        ),
        contents=full_prompt
    )
    
    raw_text = response.text.replace("```json", "").replace("```", "").strip()
    return json.loads(raw_text)


def _analyze_openai(api_key: str, full_prompt: str):
    """The new ChatGPT connection logic (forces the same output structure)"""
    client = OpenAI(api_key=api_key)
    
    response = client.chat.completions.create(
        model="gpt-4o-mini", # Fast, cheap, and very accurate
        messages=[
            {"role": "user", "content": full_prompt}
        ]
    )
    
    raw_text = response.choices[0].message.content.replace("```json", "").replace("```", "").strip()
    return json.loads(raw_text)