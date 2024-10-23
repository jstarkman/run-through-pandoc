import * as vscode from 'vscode';
import * as child_process from 'child_process';

var supportedInputFormats: string[] = [];
var supportedOutputFormats: string[] = [];
var pandocPath: string = "";

export async function activate(context: vscode.ExtensionContext) {
	const wsConf = vscode.workspace.getConfiguration('run-through-pandoc');
	pandocPath = wsConf.get("run-through-pandoc.pandocPath") || 'pandoc';
	const isWindows = process.platform === 'win32';

	try {
		if (isWindows) {
			await shellOut('where.exe', [pandocPath]);
		} else {
			await shellOut('command', ['-v', pandocPath]);
		}
	} catch (_error) {
		vscode.window.showErrorMessage(`Could not find '${pandocPath}'.  Please install it, configure the extension via 'run-through-pandoc.pandocPath', and restart the extension.`);
		return;
	}

	initSupportedFormats();
	console.log('This Pandoc supports:', supportedInputFormats, supportedOutputFormats);

	[
		vscode.commands.registerCommand('run-through-pandoc.markdownToJira', () => replaceActiveRegion('markdown', 'jira')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToMediawiki', () => replaceActiveRegion('markdown', 'mediawiki')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToRestructuredtext', () => replaceActiveRegion('markdown', 'rst')),
		vscode.commands.registerCommand('run-through-pandoc.markdownToTextile', () => replaceActiveRegion('markdown', 'textile')),
		vscode.commands.registerCommand('run-through-pandoc.prompt', prompt),
		vscode.commands.registerCommand('run-through-pandoc.promptFromMarkdown', promptFromMarkdown),
	].forEach(disposable => context.subscriptions.push(disposable));
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
	console.debug(`Converting from ${formatFrom} to ${formatTo}.`);
	const editor = vscode.window.activeTextEditor;
	if (!editor) { return; }
	const document = editor.document;
	const region = editor.selections[0];
	if (region.isEmpty) { return; }
	const text = document.getText(region);
	const newText = await pandoc(formatFrom, formatTo, text);
	editor.edit(editBuilder => editBuilder.replace(region, newText));
}

async function pandoc(formatFrom: string, formatTo: string, input: string): Promise<string> {
	return shellOut(pandocPath, [
		'--from=' + formatFrom,
		'--to=' + formatTo
	], () => input);
}

async function initSupportedFormats() {
	const tx = (await shellOut(pandocPath, ['--list-input-formats']))
		.split("\n")
		.map(s => s && s.trim() || '')
		.filter(x => !!x);
	supportedInputFormats = tx;
	const rx = (await shellOut(pandocPath, ['--list-output-formats']))
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
