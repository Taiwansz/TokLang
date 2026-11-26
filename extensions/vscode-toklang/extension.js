const vscode = require('vscode');
const path = require('path');

/**
 * TokLang v2.0 VS Code Extension
 * Uses the unified deterministic v2 compiler with real BPE monotonicity guard.
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand('vscode-toklang.compress', async function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Nenhum editor ativo encontrado.');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);
    if (!text || text.trim() === '') {
      vscode.window.showWarningMessage('Selecione um texto ou payload JSON para compilar com TokLang v2.');
      return;
    }

    let TokLangEngine;
    try {
      const enginePath = path.join(__dirname, '../../js/toklang-engine.js');
      TokLangEngine = require(enginePath);
    } catch (err) {
      vscode.window.showErrorMessage('Falha ao carregar TokLang Engine v2.');
      console.error(err);
      return;
    }

    const report = TokLangEngine.compile(text, { mode: 'balanced' });
    await editor.edit((editBuilder) => {
      editBuilder.replace(selection, report.text);
    });

    vscode.window.showInformationMessage(
      `TokLang v${report.version}: ${report.tokensBefore} -> ${report.tokensAfter} tokens (-${report.savingsPct}%) em ${report.latencyMs}ms.`
    );
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
