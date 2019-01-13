'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { JsdocController } from './controller';

let jsdocController : JsdocController;
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    jsdocController = new JsdocController(context.storagePath);
    // listen for save events
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e) => {
        jsdocController.onDidSaveTextDocument(e);
    }));
    // listen for change configuration
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        jsdocController.onDidChangeConfiguration(e);
    }));

    // register the commands
    context.subscriptions.push(vscode.commands.registerCommand('previewjsdoc.openBrowser', jsdocController.openBrowser.bind(jsdocController)));
}

// this method is called when your extension is deactivated
export function deactivate() {
    jsdocController.server.close();
}