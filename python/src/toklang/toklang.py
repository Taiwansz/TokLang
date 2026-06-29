import time
import re
import urllib.request
import json

ACTIONS = {
    "cr": "Crie",
    "fix": "Corrija o bug em",
    "ex": "Explique",
    "rf": "Refatore",
    "op": "Otimize",
    "tst": "Escreva testes para",
    "doc": "Documente",
    "cv": "Converta",
    "rev": "Revise o código de",
    "sum": "Resuma"
}

LANGUAGES = {
    "py": "Python",
    "js": "JavaScript",
    "ts": "TypeScript",
    "sql": "SQL",
    "go": "Go",
    "rs": "Rust",
    "sh": "Shell / Bash",
    "css": "CSS",
    "java": "Java",
    "rb": "Ruby",
    "cs": "C#",
    "cpp": "C++"
}

FRAMEWORKS = {
    "streamlit": "Streamlit",
    "fastapi": "FastAPI",
    "flask": "Flask",
    "pandas": "Pandas",
    "plt": "Matplotlib / Plotly",
    "react": "React",
    "next": "Next.js",
    "express": "Express.js",
    "prisma": "Prisma ORM",
    "pg": "PostgreSQL",
    "mongo": "MongoDB",
    "jest": "Jest"
}

STRUCTURES = {
    "fn": "função",
    "cls": "classe",
    "scr": "script",
    "api": "API",
    "comp": "componente",
    "hook": "hook customizado",
    "mod": "módulo",
    "mw": "middleware"
}

MODIFIERS = {
    "ui+": "com interface visual bonita e estilizada",
    "prd": "pronto para produção (seguindo as melhores práticas)",
    "cm": "com comentários explicativos no código",
    "dk": "com exemplos práticos de uso",
    "typ": "com tipagem estática/anotações de tipo",
    "async": "usando implementação assíncrona",
    "min": "versão minimalista/simples (sem dependências extras)",
    "*": "com máxima qualidade possível"
}

def count_tokens(text):
    if not text or not text.strip():
        return 0
    words = len(text.strip().split())
    punc_count = len(re.findall(r'[.,\/#!$%\^&\*;:{}=\-_`~()\[\]]', text))
    return max(1, int(round(words * 1.25 + punc_count * 0.4)))

def compress_locally(text, custom_vocab=None):
    if not text or not isinstance(text, str):
        return ""
    clean_text = text.strip()

    # Normalize custom_vocab
    vocab = {}
    if custom_vocab:
        if isinstance(custom_vocab, list):
            for item in custom_vocab:
                if not item:
                    continue
                if isinstance(item, list) and len(item) >= 2:
                    vocab[item[0]] = item[1]
                elif isinstance(item, dict):
                    key = item.get("key") or item.get("term") or item.get("token")
                    val = item.get("value") or item.get("definition") or item.get("expanded")
                    if key and val is not None:
                        vocab[key] = val
                    else:
                        for k, v in item.items():
                            vocab[k] = v
        elif isinstance(custom_vocab, dict):
            vocab = custom_vocab

    # Replace definitions with keys
    sorted_entries = sorted(vocab.items(), key=lambda x: len(str(x[1])), reverse=True)
    for key, val in sorted_entries:
        if isinstance(val, str) and val:
            clean_text = re.sub(re.escape(val), key, clean_text, flags=re.IGNORECASE)

    if len(clean_text) > 250:
        return None

    # Remove greetings
    clean_text = re.sub(r'^(por favor|bom dia|boa tarde|boa noite|ola|olá|obrigado|obrigada|favor|gentileza|gostaria de|preciso de|pode|consegue|fazer|criar)\b', '', clean_text, flags=re.IGNORECASE).strip()

    text_lower = clean_text.lower()
    action_token = None

    if re.search(r'\b(cria|crie|faça|faca|criar|create|make|gerar|gere)\b', text_lower): action_token = 'cr'
    elif re.search(r'\b(corrija|resolva|conserte|fix|debug|corrigir|resolver)\b', text_lower): action_token = 'fix'
    elif re.search(r'\b(explique|ensine|entender|como funciona|explain|how does)\b', text_lower): action_token = 'ex'
    elif re.search(r'\b(refatore|refatorar|refactor|limpar o código)\b', text_lower): action_token = 'rf'
    elif re.search(r'\b(otimize|otimizar|optimize|performance|desempenho)\b', text_lower): action_token = 'op'
    elif re.search(r'\b(teste|testes|testar|escreva testes|jest|tst|junit)\b', text_lower): action_token = 'tst'
    elif re.search(r'\b(documente|escreva documentacao|escreva documentação|document)\b', text_lower): action_token = 'doc'
    elif re.search(r'\b(converta|portar|convert|migrar|transformar)\b', text_lower): action_token = 'cv'
    elif re.search(r'\b(revise|revisar|code review|review)\b', text_lower): action_token = 'rev'
    elif re.search(r'\b(resuma|sumarize|resume|summarize)\b', text_lower): action_token = 'sum'

    if not action_token:
        return None

    lang_token = None
    if re.search(r'\b(python|py)\b', text_lower): lang_token = '$py'
    elif re.search(r'\b(javascript|js|node|nodejs)\b', text_lower): lang_token = '$js'
    elif re.search(r'\b(typescript|ts)\b', text_lower): lang_token = '$ts'
    elif re.search(r'\b(sql|postgres|mysql|sqlite)\b', text_lower): lang_token = '$sql'
    elif re.search(r'\b(golang|go)\b', text_lower): lang_token = '$go'
    elif re.search(r'\b(rust|rs)\b', text_lower): lang_token = '$rs'
    elif re.search(r'\b(shell|bash|sh)\b', text_lower): lang_token = '$sh'
    elif re.search(r'\b(css)\b', text_lower): lang_token = '$css'
    elif re.search(r'\b(java)\b', text_lower): lang_token = '$java'
    elif re.search(r'\b(ruby|rb)\b', text_lower): lang_token = '$rb'
    elif re.search(r'\b(c#|csharp)\b', text_lower): lang_token = '$cs'
    elif re.search(r'\b(c\+\+|cpp)\b', text_lower): lang_token = '$cpp'

    framework_token = None
    if re.search(r'\bstreamlit\b', text_lower): framework_token = '@streamlit'
    elif re.search(r'\bfastapi\b', text_lower): framework_token = '@fastapi'
    elif re.search(r'\bflask\b', text_lower): framework_token = '@flask'
    elif re.search(r'\bpandas\b', text_lower): framework_token = '@pandas'
    elif re.search(r'\b(matplotlib|plotly)\b', text_lower): framework_token = '@plt'
    elif re.search(r'\breact\b', text_lower): framework_token = '@react'
    elif re.search(r'\bnext\b', text_lower): framework_token = '@next'
    elif re.search(r'\bexpress\b', text_lower): framework_token = '@express'
    elif re.search(r'\bprisma\b', text_lower): framework_token = '@prisma'
    elif re.search(r'\bpostgres\b', text_lower): framework_token = '@pg'
    elif re.search(r'\bmongo\b', text_lower): framework_token = '@mongo'
    elif re.search(r'\bjest\b', text_lower): framework_token = '@jest'

    structure_token = None
    if re.search(r'\b(função|funcao|funcoes|function)\b', text_lower): structure_token = '#fn'
    elif re.search(r'\b(classe|class)\b', text_lower): structure_token = '#cls'
    elif re.search(r'\bscript\b', text_lower): structure_token = '#scr'
    elif re.search(r'\bapi\b', text_lower): structure_token = '#api'
    elif re.search(r'\bcomponente\b', text_lower): structure_token = '#comp'
    elif re.search(r'\bhook\b', text_lower): structure_token = '#hook'
    elif re.search(r'\bmódulo|modulo\b', text_lower): structure_token = '#mod'
    elif re.search(r'\bmiddleware\b', text_lower): structure_token = '#mw'

    part1 = action_token
    if lang_token: part1 += ' ' + lang_token
    if framework_token: part1 += ' ' + framework_token
    if structure_token: part1 += ' ' + structure_token

    modifiers_list = []
    if re.search(r'\b(bonito|bonita|visual|estilizado|estilizada|estiloso|estilosa|ui|lindo|linda)\b', text_lower): modifiers_list.append('ui+')
    if re.search(r'\b(produção|producao|boas práticas|boas praticas|prd|robusto|robusta)\b', text_lower): modifiers_list.append('prd')
    if re.search(r'\b(comentários|comentarios|comentado|comentada)\b', text_lower): modifiers_list.append('cm')
    if re.search(r'\b(exemplos|exemplo|prático|prática|pratico|pratica)\b', text_lower): modifiers_list.append('dk')
    if re.search(r'\b(tipagem|tipado|tipada|types|typescript type)\b', text_lower): modifiers_list.append('typ')
    if re.search(r'\b(assíncrono|assíncrona|assincrono|assincrona|async)\b', text_lower): modifiers_list.append('async')
    if re.search(r'\b(simples|mínimo|mínima|minimo|minima|minimalista|direto|direta)\b', text_lower): modifiers_list.append('min')
    if re.search(r'\b(máxima qualidade|maxima qualidade|esmerado|esmerada|\*)\b', text_lower): modifiers_list.append('*')

    inputs_part = None
    in_match = re.search(r'\b(parâmetros|parametros|campos|entradas|inputs|campos de entrada):\s*([a-zA-Z0-9,\s_]+)', text_lower)
    if in_match:
        candidates = [v.strip() for v in in_match.group(2).split(',') if v.strip()]
        valid_vars = []
        for cand in candidates:
            if re.match(r'^[a-zA-Z0-9_]+$', cand) and cand not in ('e', 'ou'):
                valid_vars.append(cand)
            else:
                break
        if valid_vars:
            inputs_part = f"in[{','.join(valid_vars)}]"

    # Clean task description
    task_clean = clean_text
    keywords = list(ACTIONS.keys()) + ["cria","crie","faça","faca","criar","create","make","gerar","gere","corrija","resolva","conserte","fix","debug","corrigir","resolver","explique","ensine","entender","como funciona","explain","how does","refatore","refatorar","refactor","limpar o código","otimize","otimizar","optimize","performance","desempenho","teste","testes","testar","escreva testes","jest","tst","junit","documente","escreva documentacao","escreva documentação","document","converta","portar","convert","migrar","transformar","revise","revisar","code review","review","resuma","sumarize","resume","summarize"]
    for kw in keywords:
        task_clean = re.sub(r'\b' + re.escape(kw) + r'\b', '', task_clean, flags=re.IGNORECASE)

    techs = list(LANGUAGES.keys()) + list(FRAMEWORKS.keys()) + list(STRUCTURES.keys()) + ["python","javascript","typescript","node","nodejs","golang","rust","shell","bash","csharp","cpp","streamlit","fastapi","flask","pandas","matplotlib","plotly","react","next","express","prisma","mongodb","mongo","jest","função","funcao","funcoes","function","classe","class","script","api","componente","hook","módulo","modulo","middleware"]
    for tech in techs:
        task_clean = re.sub(r'\b' + re.escape(tech) + r'\b', '', task_clean, flags=re.IGNORECASE)

    task_clean = re.sub(r'\b(parâmetros|parametros|campos|entradas|inputs|campos de entrada):\s*([a-zA-Z0-9,\s_]+)', '', task_clean, flags=re.IGNORECASE)
    task_clean = re.sub(r'\s+', ' ', task_clean).strip()
    task_clean = re.sub(r'^(um|uma|para|de|com|como|usando|que|de forma|de modo a|em)\b', '', task_clean, flags=re.IGNORECASE).strip()
    task_clean = re.sub(r'^(um|uma|para|de|com|como|usando|que|de forma|de modo a|em)\b', '', task_clean, flags=re.IGNORECASE).strip()

    task_part = task_clean[:80] if task_clean else "tarefa principal"
    task_part = re.sub(r'^[,;.\-\s]+|[,;.\-\s]+$', '', task_part)
    if not task_part:
        task_part = "tarefa principal"

    result = f"{part1}; {task_part}"
    if inputs_part:
        result += f"; {inputs_part}"
    if modifiers_list:
        result += f"; {' '.join(modifiers_list)}"

    return result

def expand(toklang_text, custom_vocab=None):
    if not toklang_text or not isinstance(toklang_text, str):
        return ""
    
    vocab = {}
    if custom_vocab:
        if isinstance(custom_vocab, list):
            for item in custom_vocab:
                if not item: continue
                if isinstance(item, list) and len(item) >= 2:
                    vocab[item[0]] = item[1]
                elif isinstance(item, dict):
                    key = item.get("key") or item.get("term") or item.get("token")
                    val = item.get("value") or item.get("definition") or item.get("expanded")
                    if key and val is not None:
                        vocab[key] = val
        elif isinstance(custom_vocab, dict):
            vocab = custom_vocab

    local_actions = ACTIONS.copy()
    local_languages = LANGUAGES.copy()
    local_frameworks = FRAMEWORKS.copy()
    local_structures = STRUCTURES.copy()
    local_modifiers = MODIFIERS.copy()

    for key, val in vocab.items():
        lower_key = key.lower()
        if key.startswith('$'):
            local_languages[key[1:].lower()] = val
        elif key.startswith('@'):
            local_frameworks[key[1:].lower()] = val
        elif key.startswith('#'):
            local_structures[key[1:].lower()] = val
        elif lower_key in local_actions:
            local_actions[lower_key] = val
        elif lower_key in local_modifiers:
            local_modifiers[lower_key] = val

    parts = [p.strip() for p in toklang_text.split(';') if p.strip()]
    if not parts:
        return ""

    tokens = parts[0].split()
    action = ""
    lang = ""
    framework = ""
    structure = ""

    for token in tokens:
        lower_token = token.lower()
        if lower_token in local_actions:
            action = local_actions[lower_token]
        elif token.startswith('$'):
            l_key = token[1:].lower()
            lang = local_languages.get(l_key, l_key)
        elif token.startswith('@'):
            f_key = token[1:].lower()
            framework = local_frameworks.get(f_key, f_key)
        elif token.startswith('#'):
            s_key = token[1:].lower()
            structure = local_structures.get(s_key, s_key)

    task = ""
    inputs = []
    outputs = []
    errors = []
    active_modifiers = []

    for part in parts[1:]:
        if part.startswith('in['):
            match = re.match(r'in\[(.*?)\]', part)
            if match:
                inputs = [s.strip() for s in match.group(1).split(',') if s.strip()]
        elif part.startswith('out['):
            match = re.match(r'out\[(.*?)\]', part)
            if match:
                outputs = [s.strip() for s in match.group(1).split(',') if s.strip()]
        elif part.startswith('err['):
            match = re.match(r'err\[(.*?)\]', part)
            if match:
                errors = [s.strip() for s in match.group(1).split(',') if s.strip()]
        else:
            words = part.split()
            mods_only = all(w.lower() in local_modifiers for w in words)
            if mods_only and words:
                for w in words:
                    m_val = local_modifiers.get(w.lower())
                    if m_val:
                        active_modifiers.append(m_val)
            else:
                task = part

    result = action if action else "Execute a tarefa"
    if structure: result += f" {structure}"
    if lang: result += f" em {lang}"
    if framework: result += f" usando {framework}"
    if task: result += f": {task}"

    params = []
    if inputs: params.append(f"Entradas: [{', '.join(inputs)}]")
    if outputs: params.append(f"Saídas: [{', '.join(outputs)}]")
    if errors: params.append(f"Tratar erros: [{', '.join(errors)}]")
    if params:
        result += ". " + "; ".join(params)

    if active_modifiers:
        result += f". Requisitos: {', '.join(active_modifiers)}"

    if result and not result.endswith('.'):
        result += '.'

    # Replace custom vocabulary definitions inside text
    for key, val in sorted(vocab.items(), key=lambda x: len(x[0]), reverse=True):
        keys_to_replace = [key]
        if key.startswith('$') or key.startswith('@') or key.startswith('#'):
            keys_to_replace.append(key[1:])
        for k in keys_to_replace:
            if not k or len(k) < 2: continue
            result = re.sub(r'\b' + re.escape(k) + r'\b', val, result, flags=re.IGNORECASE)

    return result

class TokLang:
    def __init__(self, api_key, baseUrl="https://toklang.dev/api/v1", custom_vocab=None):
        self.api_key = api_key
        self.base_url = baseUrl
        self.custom_vocab = custom_vocab

    def compress(self, prompt, custom_vocab=None):
        vocab = custom_vocab or self.custom_vocab
        local = compress_locally(prompt, vocab)
        if local:
            tok_before = count_tokens(prompt)
            tok_after = count_tokens(local)
            return {
                "compressed": local,
                "savings": f"{max(0, int(round((1 - tok_after / tok_before) * 100)))}%"
            }

        # API Call fallback
        url = f"{self.base_url}/compress"
        req = urllib.request.Request(url, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("x-api-key", self.api_key)
        
        payload = json.dumps({"prompt": prompt, "customVocab": vocab}).encode("utf-8")
        try:
            with urllib.request.urlopen(req, data=payload) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as e:
            raise RuntimeError(f"Error compressing prompt on TokLang: {str(e)}")

    def expand(self, toklang_text, custom_vocab=None):
        vocab = custom_vocab or self.custom_vocab
        return expand(toklang_text, vocab)

class TokLangMiddleware:
    """
    Transparent middleware for standard OpenAI python clients
    """
    def __init__(self, openai_client, toklang_api_key=None, custom_vocab=None):
        self.client = openai_client
        self.toklang_key = toklang_api_key
        self.custom_vocab = custom_vocab
        self._wrap_client()

    def _wrap_client(self):
        # We hook into the chat completions method
        original_create = self.client.chat.completions.create
        
        def wrapped_create(*args, **kwargs):
            messages = kwargs.get("messages", [])
            for msg in messages:
                if msg.get("role") == "user" and isinstance(msg.get("content"), str):
                    original_prompt = msg["content"]
                    local = compress_locally(original_prompt, self.custom_vocab)
                    if local:
                        msg["content"] = local
                    elif self.toklang_key:
                        try:
                            # Direct online call to TokLang API
                            req = urllib.request.Request("https://toklang.dev/api/v1/compress", method="POST")
                            req.add_header("Content-Type", "application/json")
                            req.add_header("x-api-key", self.toklang_key)
                            payload = json.dumps({"prompt": original_prompt, "customVocab": self.custom_vocab}).encode("utf-8")
                            with urllib.request.urlopen(req, data=payload, timeout=2) as response:
                                data = json.loads(response.read().decode("utf-8"))
                                msg["content"] = data["compressed"]
                        except Exception:
                            # Pass uncompressed on failure
                            pass
            return original_create(*args, **kwargs)

        self.client.chat.completions.create = wrapped_create
