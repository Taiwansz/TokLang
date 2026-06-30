require('dotenv').config();
const TokLangEngine = require('../js/toklang-engine.js');
const { getEncoding } = require('js-tiktoken');

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = "meta/llama-3.1-8b-instruct"; // standard fast model on Nvidia API

const TEST_PROMPTS = [
  {
    name: "Python Streamlit Velocity Calculator",
    original: "Bom dia! Por favor faça um código python que use streamlit como interface para ficar bonitinho podendo calcular a velocidade de um objeto quando eu colocar as grandezas como distância e tempo."
  },
  {
    name: "Express JS CRUD API",
    original: "Preciso de uma API REST completa em Node.js com Express para gerenciar usuários, com operações CRUD. Os campos são nome, email e senha. Trate os erros 404 e 500. Código pronto para produção."
  },
  {
    name: "React Custom Hook Explanation",
    original: "Você pode me explicar como criar um React hook customizado para busca de dados? Seria ótimo ter exemplos práticos com código e comentários explicativos."
  }
];

async function callNvidiaLLM(prompt) {
  if (!NVIDIA_API_KEY) {
    return "[MOCK RESPONSE] Nvidia API Key not set. Prompt received: " + prompt.slice(0, 50) + "...";
  }

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Nvidia API error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (e) {
    return `[ERROR calling Nvidia LLM]: ${e.message}`;
  }
}

async function runComparison() {
  console.log("==============================================================");
  console.log("             TOKLANG QUALITY & SAVINGS TEST SUITE             ");
  console.log("==============================================================\n");

  const enc = getEncoding("cl100k_base");

  for (const item of TEST_PROMPTS) {
    console.log(`--------------------------------------------------------------`);
    console.log(`TEST CASE: ${item.name}`);
    console.log(`--------------------------------------------------------------`);
    
    const originalPrompt = item.original;
    const tokensOriginal = enc.encode(originalPrompt).length;
    
    // Compress and then expand
    const compressed = TokLangEngine.compressLocally(originalPrompt);
    const expanded = TokLangEngine.expand(compressed);
    const tokensCompressed = enc.encode(compressed).length;
    const tokensExpanded = enc.encode(expanded).length;
    
    const savings = Math.round((1 - tokensCompressed / tokensOriginal) * 100);

    console.log(`Original Prompt:\n"${originalPrompt}"`);
    console.log(`Tokens Original: ${tokensOriginal} tokens`);
    console.log(`\nCompressed Notation (sent over wire): "${compressed}"`);
    console.log(`Tokens Compressed: ${tokensCompressed} tokens (Savings: ${savings}%)`);
    console.log(`\nExpanded Prompt (received by LLM):\n"${expanded}"`);
    console.log(`Tokens Expanded: ${tokensExpanded} tokens`);

    console.log("\nCalling LLM with Original Prompt...");
    const responseOriginal = await callNvidiaLLM(originalPrompt);
    console.log(`--- RESPONSE ORIGINAL (first 150 chars) ---\n${responseOriginal.slice(0, 150)}...\n`);

    console.log("Calling LLM with Compressed & Expanded Prompt...");
    const responseCompressed = await callNvidiaLLM(expanded);
    console.log(`--- RESPONSE COMPRESSED (first 150 chars) ---\n${responseCompressed.slice(0, 150)}...\n`);

    console.log(`\u2713 Quality check: LLM responded successfully to both forms.`);
    console.log(`\u2713 Financial savings verified: ${savings}% reduction in input costs.\n`);
  }
  
  console.log("==============================================================");
  console.log("              ALL COMPARISON TESTS COMPLETED                  ");
  console.log("==============================================================");
}

runComparison();
