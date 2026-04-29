# TokLang — Comprima. Comunique. Economize.

> Middleware inteligente de compressão de prompts para IA.  
> Escreva naturalmente, economize até **85% em tokens**.

---

## 📁 Estrutura do Projeto

```
TOK/
├── index.html              ← Página principal (carrega tudo)
├── toklang.html            ← Arquivo original (backup)
│
├── css/                    ← Estilos organizados por responsabilidade
│   ├── variables.css       ← Design tokens (cores, fontes, espaçamentos)
│   ├── animations.css      ← Keyframes e animações de scroll
│   ├── layout.css          ← Nav, footer, page system, backgrounds
│   ├── components.css      ← Badges, pills, buttons, toasts, a11y
│   ├── responsive.css      ← Media queries para mobile/tablet
│   └── pages/
│       ├── home.css        ← Hero, stats, how-it-works, FAQ
│       ├── app.css         ← Compressor, pipeline, sidebar
│       ├── docs.css        ← Documentação, code blocks, tables
│       ├── pricing.css     ← Tabela comparativa de planos
│       ├── auth.css        ← Login, signup, forgot password
│       └── dashboard.css   ← Métricas, charts, settings
│
├── js/                     ← Lógica separada por domínio
│   ├── auth.js             ← Estado de autenticação, login/signup/logout
│   ├── router.js           ← SPA router, reveal, cursor glow, utils
│   ├── compressor.js       ← Motor de compressão, API, pipeline UI
│   ├── dashboard.js        ← Dashboard, charts, API keys
│   └── init.js             ← Reservado para expansão futura
│
└── pages/                  ← HTML parcial de cada página
    ├── home.html           ← Landing page
    ├── app.html            ← Compressor
    ├── docs.html           ← Documentação completa
    ├── pricing.html        ← Planos e preços
    ├── login.html          ← Tela de login
    ├── signup.html         ← Tela de cadastro
    ├── forgot.html         ← Recuperação de senha
    └── dashboard.html      ← Painel do usuário
```

---

## 🚀 Como Executar

### Pré-requisito

Você precisa ter o **Python** instalado (já vem no Windows na maioria dos casos).

Para verificar, abra o **PowerShell** ou **Prompt de Comando** e digite:

```bash
python --version
```

Se aparecer algo como `Python 3.x.x`, está tudo certo.

### Passo a passo

1. **Abra o PowerShell** (ou Terminal/Prompt de Comando)

2. **Navegue até a pasta do projeto:**
   ```powershell
   cd C:\Users\52319400\Downloads\TOK
   ```

3. **Inicie o servidor local:**
   ```powershell
   python -m http.server 5500
   ```

4. **Abra no navegador:**
   ```
   http://localhost:5500
   ```

5. **Para parar o servidor**, pressione `Ctrl + C` no terminal.

### Alternativa: porta diferente

Se a porta 5500 estiver ocupada, use outra (ex: 8080):

```powershell
python -m http.server 8080
```

E acesse `http://localhost:8080`.

---

## ⚠️ Por que preciso de um servidor?

O projeto usa `fetch()` para carregar as páginas HTML dinamicamente. Navegadores bloqueiam `fetch()` em arquivos locais (`file://`) por segurança (CORS). Por isso é necessário um servidor HTTP local — o comando `python -m http.server` resolve isso sem instalar nada extra.

> **Nota:** O `toklang.html` original ainda funciona abrindo diretamente no navegador (double-click), pois é um arquivo único sem dependências externas.

---

## 🎨 Páginas Disponíveis

| Página | URL | Descrição |
|--------|-----|-----------|
| Home | `#home` | Landing page com hero, stats, FAQ |
| App | `#app` | Compressor de prompts |
| Docs | `#docs` | Documentação da gramática TokLang |
| Preços | `#pricing` | Planos e tabela comparativa |
| Login | `#login` | Autenticação (modo demo) |
| Signup | `#signup` | Criar conta (modo demo) |
| Dashboard | `#dashboard` | Painel com métricas e API keys |

---

## 🛠️ Tecnologias

- **HTML5** — Estrutura semântica
- **CSS3** — Variáveis CSS, Grid, Flexbox, animações
- **JavaScript ES6+** — Fetch API, async/await, módulos
- **Google Fonts** — JetBrains Mono + Syne
- **Zero dependências** — Nenhum framework, nenhum build step
