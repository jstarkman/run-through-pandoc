// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as child_process from 'child_process';

var supportedInputFormats: string[] = [];
var supportedOutputFormats: string[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	initSupportedFormats();
	console.log('This Pandoc supports:', supportedInputFormats, supportedOutputFormats);
	// FIXME ensure that Pandoc is installed and on the PATH; or config for path

	let disposables = [
		vscode.commands.registerCommand('run-through-pandoc.markdownToJira', () => replaceActiveRegion('markdown', 'jira')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToMediawiki', () => replaceActiveRegion('markdown', 'mediawiki')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToTextile', () => replaceActiveRegion('markdown', 'textile')),
		vscode.commands.registerCommand('run-through-pandoc.prompt', prompt),
		vscode.commands.registerCommand('run-through-pandoc.promptFromMarkdown', promptFromMarkdown),
	];

	for (var disp in disposables) {
		var disposable = disposables[disp];
		context.subscriptions.push(disposable);
	}
}

async function prompt() {
	const formatIn = await vscode.window.showQuickPick(supportedInputFormats, {
		title: 'Select input format',
	});
	const formatOut = await vscode.window.showQuickPick(supportedOutputFormats, {
		title: 'Select output format',
	});
	replaceActiveRegion(formatIn || 'markdown', formatOut || 'html');
}

async function promptFromMarkdown() {
	const formatOut = await vscode.window.showQuickPick(supportedOutputFormats, {
		title: 'Select output format',
	});
	replaceActiveRegion('markdown', formatOut || 'html');
}

function replaceActiveRegion(formatFrom: string, formatTo: string) {
	console.debug(`Converting from ${formatFrom} to ${formatTo}.`)
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const document = editor.document;
	editor.edit(editBuilder => {
		const region = editor.selections[0];
		const text = document.getText(region);
		const newText = pandoc(formatFrom, formatTo, text);
		editBuilder.replace(region, newText)
	});
}

function pandoc(formatFrom: string, formatTo: string, input: string): string {
	return shellOut('pandoc', [
		'--from=' + formatFrom,
		'--to=' + formatTo
	], () => input);
}

function initSupportedFormats() {
	const tx = shellOut('pandoc', ['--list-input-formats'])
		.split("\n")
		.map(s => s && s.trim() || '')
		.filter(x => !!x);
	supportedInputFormats = tx;
	const rx = shellOut('pandoc', ['--list-output-formats'])
		.split("\n")
		.map(s => s && s.trim() || '')
		.filter(x => !!x);
	supportedOutputFormats = rx;
}

function shellOut(cmd: string, args: string[], toStdin?: (() => string)) {
	const command = cmd + ' ' + args.join(' ');
	const stdout: string = child_process.execSync(command, {
		input: toStdin && toStdin() || '',
		timeout: 1000,  // arbitrary but finite
		encoding: 'utf-8',
	});
	return stdout;
}

// this method is called when your extension is deactivated
export function deactivate() {}
