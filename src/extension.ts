'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Server from './server';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

const open = require('opn');
const mkdirp = require('mkdirp');

class JsdocController {

    server: Server;
    countRequested : number = 0;
    confFile : string;
    sourceUri : vscode.Uri;
    root : string;
    outputChannel : vscode.OutputChannel;
    constructor(private context : vscode.ExtensionContext) {
        // create the storage path if not exist
        
        this.confFile = path.join(context.storagePath, 'conf.json');
        this.root = this.context.storagePath;
        this.outputChannel = vscode.window.createOutputChannel('PreviewJsDoc');
        if (!fs.existsSync(context.storagePath)) {
            mkdirp.sync(context.storagePath);
            this.onDidChangeConfiguration(null);
        }
    }

    async openBrowser() {
        const port  = vscode.workspace.getConfiguration('previewjsdoc').get<number>('port');
        const url = `http://localhost:${port}`;
        return open(url, { app : process.platform === 'darwin' ? 'safari' : null});
    }
    async onDidServerStart() {
        // run jsdoc
        try {
            
            await this.runJsDoc();
        } catch (error) {
           console.error(error); 
        }
        return this.openBrowser();
        
    };

    onDidChangeConfiguration(e) {
        const jsdocConfig : { opts : any, templates : any} = vscode.workspace.getConfiguration('previewjsdoc').get('conf');
        jsdocConfig.opts = jsdocConfig.opts || { recurse : true};
        jsdocConfig.opts.destination = this.root;
        jsdocConfig.templates = jsdocConfig.templates || {}
        jsdocConfig.templates.default = {
            layoutFile : path.resolve(__dirname, '..', 'layout.tmpl')
        }
        fs.writeFile(this.confFile, JSON.stringify(jsdocConfig));
    }

    async onDidSaveTextDocument(e : vscode.TextDocument) {
        this.sourceUri = e.uri;
        if (!this.server) {
            const port = vscode.workspace.getConfiguration('previewjsdoc').get<number>('port');
            this.server = new Server({ root : this.root, port : port, onDidStart : this.onDidServerStart.bind(this)})
        } else {
            if (this.countRequested > 0) {
                this.countRequested += 1;
                return;
            }
            this.countRequested += 1;
            this.server.notifyJSDocWillComputed();
            await this.runJsDoc();
            this.countRequested -= 1;
            if (this.countRequested > 0) {
                // chained save events
                this.runJsDoc();
            }
            this.server.notifyJSDocComputed();
            this.countRequested = 0;
        }
    };


    async runJsDoc() {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(this.sourceUri);
        if (!workspaceFolder) {
            return;
        }
        const sources = workspaceFolder.uri.fsPath;
         return new Promise((resolve, reject) => {
             
             cp.exec(`jsdoc -c "${this.confFile}" ${sources} --verbose`, (error, stdout, stderr) => {
                this.outputChannel.append(stdout);
                if (error) {
                    this.outputChannel.append(stderr);
                    reject(error);
                } else {
                    resolve();
                }
             })
         })
    }

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const jsdocController = new JsdocController(context);
    // listen for save events
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((e) => {
        jsdocController.onDidSaveTextDocument(e);
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        jsdocController.onDidChangeConfiguration(e);
    }));
    
}

// this method is called when your extension is deactivated
export function deactivate() {
}