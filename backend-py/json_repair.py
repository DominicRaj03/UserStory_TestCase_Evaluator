import re

def repair_json_string(content: str) -> str:
    """
    Attempts to extract and repair a JSON object from LLM output.
    Handles common issues: markdown fences, trailing commas, unquoted keys, comments.
    """
    if not content or not content.strip():
        raise ValueError("Empty content provided")

    text = content.strip()

    # Remove markdown code fences
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```\s*$', '', text, flags=re.MULTILINE)
    text = text.strip()

    # Extract JSON object between first { and last }
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        # Try array
        start = text.find('[')
        end = text.rfind(']')
        if start == -1 or end == -1:
            raise ValueError(f"No JSON found in content: {text[:200]}")

    text = text[start:end + 1]

    # Remove JavaScript-style comments
    text = re.sub(r'//[^\n\r]*', '', text)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)

    # Remove trailing commas before closing braces/brackets
    text = re.sub(r',\s*([}\]])', r'\1', text)

    # Fix unquoted keys  (  key: value  →  "key": value )
    text = re.sub(r'(?<=[{,\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'"\1":', text)

    return text
