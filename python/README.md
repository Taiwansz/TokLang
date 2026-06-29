# TokLang Python SDK

A semantic prompt compression middleware and utility library for LLMs. Reduce prompt size, optimize context windows, and save API cost.

## Installation

You can install the TokLang Python SDK locally:

```bash
pip install .
```

## Quick Start

### 1. Local/Offline Shorthand Compression

Compress prompts locally using fast regex heuristics and rules:

```python
from toklang import compress_locally, expand

# Input prompt
prompt = "Cria um script python usando streamlit para calcular velocidade de forma bonita"

# Compress prompt
shorthand = compress_locally(prompt)
print("Compressed:", shorthand)
# Output: "cr $py @streamlit #scr; calc vel; ui+"

# Expand shorthand back to natural language
expanded = expand(shorthand)
print("Expanded:", expanded)
# Output: "Crie em Python usando Streamlit: calcular velocidade. Requisitos: com interface visual bonita e estilizada."
```

### 2. Connect to TokLang API (Online Mode)

Use the full LLM-powered semantic compression for complex prompts:

```python
from toklang import TokLang

client = TokLang(api_key="your_toklang_api_key")

# Compress using cloud LLM parser
shorthand = client.compress("Some very long prompt...")
print("Shorthand:", shorthand)
```

### 3. OpenAI Client Middleware Integration

Automatically intercept and compress system/user prompts sent to OpenAI:

```python
import openai
from toklang import TokLangMiddleware

openai_client = openai.OpenAI(api_key="your_openai_key")

# Wrap client with TokLang middleware
wrapped_client = TokLangMiddleware(
    openai_client=openai_client,
    toklang_api_key="your_toklang_key"
)

# Prompts are compressed automatically before transmission!
response = wrapped_client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Cria um script python usando streamlit para calcular velocidade de forma bonita"}
    ]
)
```

## License

MIT License.
