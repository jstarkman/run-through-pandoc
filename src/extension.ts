import * as vscode from 'vscode';
import * as child_process from 'child_process';

var supportedInputFormats: string[] = [];
var supportedOutputFormats: string[] = [];

export function activate(context: vscode.ExtensionContext) {
	shellOut('command', ['-v', 'pandoc'])
		.catch(() => vscode.window.showErrorMessage('Could not find `pandoc` on the system path.  Please install it and restart the extension.'));

	initSupportedFormats();
	console.log('This Pandoc supports:', supportedInputFormats, supportedOutputFormats);

	let disposables = [
		vscode.commands.registerCommand('run-through-pandoc.markdownToJira', () => replaceActiveRegion('markdown', 'jira')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToMediawiki', () => replaceActiveRegion('markdown', 'mediawiki')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToRestructuredtext', () => replaceActiveRegion('markdown', 'rst')),
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

async function replaceActiveRegion(formatFrom: string, formatTo: string) {
	console.debug(`Converting from ${formatFrom} to ${formatTo}.`)
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;
	const document = editor.document;
	const region = editor.selections[0];
	if (region.isEmpty) return;
	const text = document.getText(region);
	const newText = await pandoc(formatFrom, formatTo, text);
	editor.edit(editBuilder => {
		editBuilder.replace(region, newText);
	});
}

async function pandoc(formatFrom: string, formatTo: string, input: string): Promise<string> {
	return shellOut('pandoc', [
		'--from=' + formatFrom,
		'--to=' + formatTo
	], () => input);
}

async function initSupportedFormats() {
	const tx = (await shellOut('pandoc', ['--list-input-formats']))
		.split("\n")
		.map(s => s && s.trim() || '')
		.filter(x => !!x);
	supportedInputFormats = tx;
	const rx = (await shellOut('pandoc', ['--list-output-formats']))
		.split("\n")
		.map(s => s && s.trim() || '')
		.filter(x => !!x);
	supportedOutputFormats = rx;
}

async function shellOut(cmd: string, args: string[], toStdin?: (() => string)) {
	const command = cmd + ' ' + args.join(' ');
	const stdout: string = child_process.execSync(command, {
		input: toStdin && toStdin() || '',
		timeout: 1000,  // arbitrary but finite
		encoding: 'utf-8',
	});
	return stdout;
}

export function deactivate() {}
