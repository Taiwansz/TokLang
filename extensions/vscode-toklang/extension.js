const vscode = require('vscode');
const path = require('path');

/**
 * Activates the TokLang extension.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('TokLang extension is now active!');

    let disposable = vscode.commands.registerCommand('vscode-toklang.compress', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Nenhum editor ativo encontrado.');
            return;
        }

        const selection = editor.selection;
        let text = editor.document.getText(selection);

        if (!text || text.trim() === '') {
            vscode.window.showWarningMessage('Por favor, selecione um texto para comprimir.');
            return;
        }

        let TokLangEngine;
        try {
            // Relative path from extension directory to js/toklang-engine.js
            const enginePath = path.join(__dirname, '../../js/toklang-engine.js');
            TokLangEngine = require(enginePath);
        } catch (err) {
            vscode.window.showErrorMessage('Não foi possível carregar a Engine local do TokLang.');
            console.error(err);
            return;
        }

        let compressed = TokLangEngine.compressLocally(text);

        if (compressed === null) {
            const action = await vscode.window.showWarningMessage(
                'A Engine local não conseguiu comprimir este texto (muito longo ou sem ação clara). Deseja tentar uma compressão simplificada forçada?',
                'Sim, forçar', 'Cancelar'
            );
            if (action === 'Sim, forçar') {
                compressed = forceLocalCompression(TokLangEngine, text);
            } else {
                return;
            }
        }

        if (compressed) {
            editor.edit(editBuilder => {
                editBuilder.replace(selection, compressed);
            });
            vscode.window.showInformationMessage('Texto comprimido com sucesso pelo TokLang!');
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Simplified bypass version of compressLocally that does not return null for larger texts
 * or missing default actions.
 * @param {object} engine 
 * @param {string} text 
 * @returns {string} TokLang compressed string
 */
function forceLocalCompression(engine, text) {
    let cleanText = text.trim();
    
    // Clean greetings and politeness
    cleanText = cleanText
      .replace(/^(por favor|bom dia|boa tarde|boa noite|ola|olá|obrigado|obrigada|favor|gentileza|gostaria de|preciso de|pode|consegue|fazer|criar)\b/gi, '')
      .trim();

    // Heuristics for Action
    let actionToken = 'cr'; // default fallback
    const textLower = cleanText.toLowerCase();
    
    if (/\b(cria|crie|faça|faca|criar|create|make|gerar|gere)\b/.test(textLower)) actionToken = 'cr';
    else if (/\b(corrija|resolva|conserte|fix|debug|corrigir|resolver)\b/.test(textLower)) actionToken = 'fix';
    else if (/\b(explique|ensine|entender|como funciona|explain|how does)\b/.test(textLower)) actionToken = 'ex';
    else if (/\b(refatore|refatorar|refactor|limpar o código)\b/.test(textLower)) actionToken = 'rf';
    else if (/\b(otimize|otimizar|optimize|performance|desempenho)\b/.test(textLower)) actionToken = 'op';
    else if (/\b(teste|testes|testar|escreva testes|jest|tst|junit)\b/.test(textLower)) actionToken = 'tst';
    else if (/\b(documente|escreva documentacao|escreva documentação|document)\b/.test(textLower)) actionToken = 'doc';
    else if (/\b(converta|portar|convert|migrar|transformar)\b/.test(textLower)) actionToken = 'cv';
    else if (/\b(revise|revisar|code review|review)\b/.test(textLower)) actionToken = 'rev';
    else if (/\b(resuma|sumarize|resume|summarize)\b/.test(textLower)) actionToken = 'sum';

    // Detect language
    let langToken = null;
    if (/\b(python|py)\b/.test(textLower)) langToken = '$py';
    else if (/\b(javascript|js|node|nodejs)\b/.test(textLower)) langToken = '$js';
    else if (/\b(typescript|ts)\b/.test(textLower)) langToken = '$ts';
    else if (/\b(sql|postgres|mysql|sqlite)\b/.test(textLower)) langToken = '$sql';
    else if (/\b(golang|go)\b/.test(textLower)) langToken = '$go';
    else if (/\b(rust|rs)\b/.test(textLower)) langToken = '$rs';
    else if (/\b(shell|bash|sh)\b/.test(textLower)) langToken = '$sh';
    else if (/\b(css)\b/.test(textLower)) langToken = '$css';
    else if (/\b(java)\b/.test(textLower)) langToken = '$java';
    else if (/\b(ruby|rb)\b/.test(textLower)) langToken = '$rb';
    else if (/\b(c#|csharp)\b/.test(textLower)) langToken = '$cs';
    else if (/\b(c\+\+|cpp)\b/.test(textLower)) langToken = '$cpp';

    // Detect Framework
    let frameworkToken = null;
    if (/\bstreamlit\b/.test(textLower)) frameworkToken = '@streamlit';
    else if (/\bfastapi\b/.test(textLower)) frameworkToken = '@fastapi';
    else if (/\bflask\b/.test(textLower)) frameworkToken = '@flask';
    else if (/\bpandas\b/.test(textLower)) frameworkToken = '@pandas';
    else if (/\b(matplotlib|plotly)\b/.test(textLower)) frameworkToken = '@plt';
    else if (/\breact\b/.test(textLower)) frameworkToken = '@react';
    else if (/\bnext\b/.test(textLower)) frameworkToken = '@next';
    else if (/\bexpress\b/.test(textLower)) frameworkToken = '@express';
    else if (/\bprisma\b/.test(textLower)) frameworkToken = '@prisma';
    else if (/\bpostgres\b/.test(textLower)) frameworkToken = '@pg';
    else if (/\bmongo\b/.test(textLower)) frameworkToken = '@mongo';
    else if (/\bjest\b/.test(textLower)) frameworkToken = '@jest';

    // Detect Structure
    let structureToken = null;
    if (/\b(função|funcao|funcoes|function)\b/.test(textLower)) structureToken = '#fn';
    else if (/\b(classe|class)\b/.test(textLower)) structureToken = '#cls';
    else if (/\bscript\b/.test(textLower)) structureToken = '#scr';
    else if (/\bapi\b/.test(textLower)) structureToken = '#api';
    else if (/\bcomponente\b/.test(textLower)) structureToken = '#comp';
    else if (/\bhook\b/.test(textLower)) structureToken = '#hook';
    else if (/\bmódulo|modulo\b/.test(textLower)) structureToken = '#mod';
    else if (/\bmiddleware\b/.test(textLower)) structureToken = '#mw';

    // Build the first part
    let part1 = actionToken;
    if (langToken) part1 += ' ' + langToken;
    if (frameworkToken) part1 += ' ' + frameworkToken;
    if (structureToken) part1 += ' ' + structureToken;

    // Modifiers detection
    const modifiersList = [];
    if (/\b(bonito|bonita|visual|estilizado|estilizada|estiloso|estilosa|ui|lindo|linda)\b/.test(textLower)) modifiersList.push('ui+');
    if (/\b(produção|producao|boas práticas|boas praticas|prd|robusto|robusta)\b/.test(textLower)) modifiersList.push('prd');
    if (/\b(comentários|comentarios|comentado|comentada)\b/.test(textLower)) modifiersList.push('cm');
    if (/\b(exemplos|exemplo|prático|prática|pratico|pratica)\b/.test(textLower)) modifiersList.push('dk');
    if (/\b(tipagem|tipado|tipada|types|typescript type)\b/.test(textLower)) modifiersList.push('typ');
    if (/\b(assíncrono|assíncrona|assincrono|assincrona|async)\b/.test(textLower)) modifiersList.push('async');
    if (/\b(simples|mínimo|mínima|minimo|minima|minimalista|direto|direta)\b/.test(textLower)) modifiersList.push('min');
    if (/\b(máxima qualidade|maxima qualidade|esmerado|esmerada|\*)\b/.test(textLower)) modifiersList.push('*');

    // Extract inputs/params if any
    let inputsPart = null;
    const inMatch = textLower.match(/\b(parâmetros|parametros|campos|entradas|inputs|campos de entrada):\s*([a-zA-Z0-9,\s_]+)/);
    if (inMatch) {
      const candidates = inMatch[2].split(',').map(v => v.trim()).filter(Boolean);
      const validVars = [];
      for (const cand of candidates) {
        if (/^[a-zA-Z0-9_]+$/.test(cand) && cand !== 'e' && cand !== 'ou') {
          validVars.push(cand);
        } else {
          break;
        }
      }
      if (validVars.length > 0) {
        inputsPart = `in[${validVars.join(',')}]`;
      }
    }

    // Try to extract task description
    let taskClean = cleanText
      .replace(new RegExp(`\\b(cria|crie|faça|faca|criar|create|make|gerar|gere|corrija|resolva|conserte|fix|debug|corrigir|resolver|explique|ensine|entender|como funciona|explain|how does|refatore|refatorar|refactor|limpar o código|otimize|otimizar|optimize|performance|desempenho|teste|testes|testar|escreva testes|jest|tst|junit|documente|escreva documentacao|escreva documentação|document|converta|portar|convert|migrar|transformar|revise|revisar|code review|review|resuma|sumarize|resume|summarize)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(python|py|javascript|js|node|nodejs|typescript|ts|sql|postgres|mysql|sqlite|golang|go|rust|rs|shell|bash|sh|css|java|ruby|rb|c#|csharp|c\\+\\+|cpp)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(streamlit|fastapi|flask|pandas|matplotlib|plotly|react|next|express|prisma|mongodb|mongo|jest)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(função|funcao|funcoes|function|classe|class|script|api|componente|hook|módulo|modulo|middleware)\\b`, 'gi'), '')
      .replace(new RegExp(`\\b(parâmetros|parametros|campos|entradas|inputs|campos de entrada):\\s*([a-zA-Z0-9,\\s_]+)`, 'gi'), '')
      .replace(new RegExp(`\\b(bonito|bonita|visual|estilizado|estilizada|estiloso|estilosa|ui|lindo|linda|produção|producao|boas práticas|boas praticas|prd|robusto|robusta|comentários|comentarios|comentado|comentada|exemplos|exemplo|prático|prática|pratico|pratica|tipagem|tipado|tipada|types|typescript type|assíncrono|assíncrona|assincrono|assincrona|async|simples|mínimo|mínima|minimo|minima|minimalista|direto|direta|máxima qualidade|maxima qualidade|esmerado|esmerada)\\b`, 'gi'), '')
      .replace(/\s+/g, ' ')
      .trim();

    taskClean = taskClean
      .replace(/^(um|uma|para|de|com|como|usando|que|de forma|de modo a|em)\b/gi, '')
      .replace(/^(um|uma|para|de|com|como|usando|que|de forma|de modo a|em)\b/gi, '')
      .trim();

    let taskPart = taskClean ? taskClean.substring(0, 100) : "tarefa principal";
    taskPart = taskPart.replace(/^[,;.\-\s]+|[,;.\-\s]+$/g, '');
    if (!taskPart) taskPart = "tarefa principal";

    let result = part1 + '; ' + taskPart;
    if (inputsPart) result += '; ' + inputsPart;
    if (modifiersList.length > 0) result += '; ' + modifiersList.join(' ');

    return result;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
