#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const TokLangEngine = require('./js/toklang-engine');

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
🤖 TokLang CLI - Semantic Compression Engine

Uso:
  toklang-cli <action> [input] [options]

Ações:
  compress "<prompt>"      Comprime o prompt informado localmente.
  expand "<shorthand>"     Expande a notação TokLang de volta para linguagem natural.
  file <path>              Lê um arquivo de texto, comprime seu conteúdo e exibe/salva.

Opções:
  --vocab <path>           Carrega um arquivo JSON de vocabulário customizado.
  --out <path>             Salva o resultado em um arquivo de saída (válido para a ação 'file').

Exemplos:
  node cli.js compress "Cria um script python usando streamlit para calcular velocidade de forma bonita"
  node cli.js expand "cr $py @streamlit #scr; calcular velocidade; ui+"
  node cli.js file meu_prompt.txt --out meu_prompt_comprimido.txt
  `);
}

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

const action = args[0];
const inputArg = args[1];

if (!['compress', 'expand', 'file'].includes(action)) {
  console.error(`❌ Erro: Ação "${action}" desconhecida.`);
  showHelp();
  process.exit(1);
}

if (!inputArg) {
  console.error('❌ Erro: Entrada (texto ou caminho do arquivo) é obrigatória.');
  process.exit(1);
}

// Parse options
let customVocab = null;
const vocabIndex = args.indexOf('--vocab');
if (vocabIndex !== -1 && args[vocabIndex + 1]) {
  const vocabPath = path.resolve(args[vocabIndex + 1]);
  try {
    const rawVocab = fs.readFileSync(vocabPath, 'utf8');
    customVocab = JSON.parse(rawVocab);
    console.log(`💡 Vocabulário customizado carregado de: ${vocabPath}`);
  } catch (err) {
    console.error(`❌ Erro ao ler o arquivo de vocabulário customizado: ${err.message}`);
    process.exit(1);
  }
}

let outputPath = null;
const outIndex = args.indexOf('--out');
if (outIndex !== -1 && args[outIndex + 1]) {
  outputPath = path.resolve(args[outIndex + 1]);
}

// Execute actions
if (action === 'compress') {
  const start = Date.now();
  const res = TokLangEngine.compressLocally(inputArg, customVocab);
  const duration = Date.now() - start;
  
  if (res) {
    console.log(`\n⚡ Comprimido em ${duration}ms:`);
    console.log(res);
  } else {
    console.log('\n⚠️ A Engine local não pôde comprimir este prompt (tamanho ou falta de ação clara).');
  }
} 
else if (action === 'expand') {
  const start = Date.now();
  const res = TokLangEngine.expand(inputArg, customVocab);
  const duration = Date.now() - start;
  
  console.log(`\n⚡ Expandido em ${duration}ms:`);
  console.log(res);
} 
else if (action === 'file') {
  const filePath = path.resolve(inputArg);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Erro: Arquivo não encontrado em: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`📖 Lendo arquivo: ${filePath} (${fileContent.length} caracteres)`);
    
    const start = Date.now();
    const res = TokLangEngine.compressLocally(fileContent, customVocab);
    const duration = Date.now() - start;
    
    if (res) {
      if (outputPath) {
        fs.writeFileSync(outputPath, res, 'utf8');
        console.log(`✅ Salvo em: ${outputPath}`);
      } else {
        console.log(`\n⚡ Comprimido em ${duration}ms:`);
        console.log(res);
      }
    } else {
      console.log('\n⚠️ A Engine local não pôde comprimir o conteúdo deste arquivo.');
    }
  } catch (err) {
    console.error(`❌ Erro ao processar o arquivo: ${err.message}`);
    process.exit(1);
  }
}
