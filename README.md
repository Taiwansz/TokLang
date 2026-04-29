<p align="center">
  <strong>Tok</strong>Lang
</p>

<h3 align="center">Comprima. Comunique. Economize.</h3>

<p align="center">
  Middleware inteligente de compressão de prompts para IA.<br>
  Escreva naturalmente, economize até <strong>85% em tokens</strong>.
</p>

<p align="center">
  <a href="#-sobre">Sobre</a> •
  <a href="#-demo">Demo</a> •
  <a href="#-como-executar">Executar</a> •
  <a href="#-estrutura">Estrutura</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-licença">Licença</a>
</p>

---

## 💡 Sobre

**TokLang** é um motor de compressão semântica que atua como intermediário invisível entre o usuário e qualquer modelo de linguagem (GPT, Claude, Gemini). Ele converte prompts em linguagem natural para uma notação comprimida proprietária, reduzindo drasticamente o consumo de tokens — sem alterar o comportamento ou qualidade da resposta.

### Como funciona

```
PROMPT NATURAL                          TOKLANG COMPRIMIDO
─────────────────────────────────────   ───────────────────────────────
"Bom dia! Por favor faça um código      cr $py @streamlit;
python que use streamlit como            calc velocidade;
interface para calcular a velocidade     in[dist,t,a]; ui+
de um objeto quando eu colocar as
grandezas"
                                        34 tokens → 8 tokens (−76%)
```

O pipeline completo:

```
1. INPUT    → prompt natural do usuário
2. COMPRESS → motor TokLang → notação comprimida
3. EXPAND   → expansor → linguagem natural limpa
4. OUTPUT   → enviado ao modelo de destino
```

> O usuário nunca vê ou toca na notação TokLang. Ela opera completamente em segundo plano.

---

## 🎬 Demo

A aplicação inclui um compressor funcional com interface completa:

| Página | Rota | Descrição |
|--------|------|-----------|
| **Home** | `#home` | Landing page com hero, estatísticas e FAQ |
| **App** | `#app` | Compressor de prompts com pipeline visual |
| **Docs** | `#docs` | Documentação completa da gramática TokLang |
| **Preços** | `#pricing` | Planos, comparação e FAQ de preços |
| **Login** | `#login` | Autenticação (modo demo) |
| **Signup** | `#signup` | Criação de conta (modo demo) |
| **Dashboard** | `#dashboard` | Painel com métricas, histórico e API keys |

> As rotas de autenticação e dashboard operam em **modo demonstração** (localStorage). Prontas para integração com backend real.

---

## 🚀 Como Executar

### Pré-requisito

- **Python 3.x** (para o servidor HTTP local)

```bash
python --version   # Verificar se está instalado
```

### Execução

```bash
# 1. Clone o repositório
git clone https://github.com/Taiwansz/TokLang.git
cd TokLang

# 2. Inicie o servidor local
python -m http.server 5500

# 3. Acesse no navegador
# http://localhost:5500
```

Para encerrar o servidor: `Ctrl + C`

### Porta alternativa

```bash
python -m http.server 8080    # Qualquer porta disponível
```

### Por que preciso de um servidor?

O projeto usa `fetch()` para carregar páginas HTML como partials. Navegadores bloqueiam requisições `fetch()` em `file://` por política de segurança (CORS). O servidor HTTP local resolve isso sem dependências externas.

---

## 📁 Estrutura

```
TokLang/
├── index.html              ← Shell SPA (carrega partials via fetch)
├── toklang.html            ← Versão monolítica original (backup)
│
├── css/                    ← Estilos organizados por responsabilidade
│   ├── variables.css       ← Design tokens (cores, fontes, espaçamentos)
│   ├── animations.css      ← Keyframes e animações de scroll reveal
│   ├── layout.css          ← Nav, footer, page system, backgrounds
│   ├── components.css      ← Badges, pills, buttons, toasts
│   ├── responsive.css      ← Media queries (mobile / tablet)
│   └── pages/
│       ├── home.css        ← Hero, stats, how-it-works, FAQ
│       ├── app.css         ← Compressor, pipeline, sidebar
│       ├── docs.css        ← Documentação, code blocks, tabelas
│       ├── pricing.css     ← Planos e tabela comparativa
│       ├── auth.css        ← Login, signup, forgot password
│       └── dashboard.css   ← Métricas, charts, settings
│
├── js/                     ← Lógica separada por domínio
│   ├── auth.js             ← Estado de autenticação, login/signup/logout
│   ├── router.js           ← SPA router, scroll reveal, cursor glow
│   ├── compressor.js       ← Motor de compressão, API, pipeline UI
│   ├── dashboard.js        ← Dashboard, mini-charts, API keys
│   └── init.js             ← Bootstrap e inicialização
│
└── pages/                  ← HTML partials (injetados no index.html)
    ├── home.html           ← Landing page
    ├── app.html            ← Compressor interativo
    ├── docs.html           ← Documentação da gramática
    ├── pricing.html        ← Planos e preços
    ├── login.html          ← Autenticação
    ├── signup.html         ← Criação de conta
    ├── forgot.html         ← Recuperação de senha
    └── dashboard.html      ← Painel do usuário
```

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|------------|-----|
| **HTML5** | Estrutura semântica |
| **CSS3** | Custom Properties, Grid, Flexbox, animações |
| **JavaScript ES6+** | Fetch API, async/await, módulos |
| **Google Fonts** | JetBrains Mono · Syne |

> **Zero dependências.** Nenhum framework. Nenhum build step. Nenhum `node_modules`.

---

## 🗺️ Roadmap

- [ ] **Backend API** — Proxy server para proteger chaves de API (Express/Fastify)
- [ ] **Autenticação real** — JWT + bcrypt + verificação de e-mail
- [ ] **Banco de dados** — Prisma + PostgreSQL para persistência de dados
- [ ] **SDK npm** — `npm install toklang` para integração programática
- [ ] **Extensão de navegador** — Compressão automática em qualquer chat de IA
- [ ] **Bundler** — Migração para Vite caso a complexidade aumente
- [ ] **Testes** — E2E com Playwright, unitários com Vitest

---

## 📄 Licença

MIT © TokLang
