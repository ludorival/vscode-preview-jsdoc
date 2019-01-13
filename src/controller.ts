'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import Server from './server';
import * as path from 'path';
import * as fs from 'fs';
import { mkdir } from './utils';
import { runJsDoc } from './jsdoc';
const open = require('opn');

const ACCEPTED_EXT = ['.js', '.jsx', '.md', '.json'];
interface ChangedConfiguration {
    output? : boolean,
    jsdocConf? : boolean,
    port? : boolean
}
export class JsdocController {

    readonly server: Server;
    countRequested: number = 0;
    outputChannel: vscode.OutputChannel;
    forceOpenBrowser: boolean = false;
    serverHasStarted : boolean = false;
    settingsHasChangedFor : ChangedConfiguration = {};

    constructor(private storagePath: string) {
        this.outputChannel = vscode.window.createOutputChannel('PreviewJsDoc');
        const port = vscode.workspace.getConfiguration('previewjsdoc').get<number>('port');
        this.server = new Server({
            root: this.root,
            port: port,
            onDidStart: this.onDidServerStart.bind(this)
        });

    }


    // #region commands
    async openBrowser(forceRunJsDoc  = true) {
        if (!this.serverHasStarted) {
            vscode.window.showInformationMessage('The server has not started. Please wait a moment ...');
            this.forceOpenBrowser = true;
            return;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return vscode.window.showErrorMessage('There is no opening workspace');
        }
        if (forceRunJsDoc) {
            return this.safeRunJsDoc(vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.fileName : workspaceFolders[0].uri.fsPath);
        } 
        open(this.server.url, { app: process.platform === 'darwin' ? 'safari' : null });
    }
    // #endregion
    
    // #region events
     onDidServerStart() {
        this.serverHasStarted = true;
        if (this.forceOpenBrowser) {
            return this.openBrowser();
        }
    }

    async onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {

        if (e && !e.affectsConfiguration('previewjsdoc')) {
            return;
        }
        
        this.settingsHasChangedFor.output = e.affectsConfiguration('previewjsdoc.output');
        this.settingsHasChangedFor.jsdocConf = e.affectsConfiguration('previewjsdoc.conf');
        
    }
    
     onDidSaveTextDocument(e: vscode.TextDocument) {
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName !== e.fileName) {
            // the current saved document is not the active document ignore it
            return;
        }
        this.safeRunJsDoc(e.uri.fsPath)
    };

    // #endregion

    // #region getters
   
    get output() {
        const { getConfiguration, getWorkspaceFolder, workspaceFolders } = vscode.workspace;
        const output = getConfiguration('previewjsdoc').get<string>('output') || this.storagePath;
        const workspaceFolder = getWorkspaceFolder(vscode.Uri.file(output)) || workspaceFolders[0]
        return path.isAbsolute(output) ? output : path.join(workspaceFolder.uri.fsPath, output);
    }

    get root() {
        return path.join(this.output, 'www');
    }

    get confFile() {
        return path.join(this.output, 'conf.json');
    }

    get tutorials() {
        return path.join(this.output, 'tutorials');
    }

    get autoOpenBrowser() {
        return vscode.workspace.getConfiguration('previewjsdoc').get<boolean>('autoOpenBrowser');
    }

    // #endregion

    // #region JsDoc
    private updateJsDocConfig() {
        // change the conf to override the default layout template
        const jsdocConfig: { opts: any, templates: any } = vscode.workspace.getConfiguration('previewjsdoc').get('conf');
        const json = JSON.parse(JSON.stringify(jsdocConfig));
        if (!jsdocConfig.templates) {
            json.templates = {
                default: {
                    layoutFile: path.resolve(__dirname, '..', 'layout.tmpl')
                }
            };
        }
        fs.writeFile(this.confFile, JSON.stringify(json, null, 2));
    }

    async setUpIfNeeded() {

        const outputExists = fs.existsSync(this.output);
        const tutorialsExists = fs.existsSync(this.tutorials);
        const jsdocConfExists = fs.existsSync(this.confFile);

        !outputExists && await mkdir(this.output);
        !tutorialsExists && await mkdir(this.tutorials);

        (!jsdocConfExists || this.settingsHasChangedFor.jsdocConf ) && this.updateJsDocConfig();

        if (this.settingsHasChangedFor.output) {
            this.server.setCurrentRoot(this.output);
        }

    }

    private async safeRunJsDoc(source : string) {
        if (this.countRequested > 0) {
            this.countRequested += 1;
            return;
        }
        
        let error;
        this.server.notifyJSDocWillComputed();
        try {
            await this.setUpIfNeeded();
            this.countRequested += 1;
            await this.runJsDoc(source);
            this.countRequested -= 1;
            if (this.countRequested > 0) {
                // chained save events
                this.runJsDoc(source);
            }
        } catch (err) {
            error = err || new Error('Error when running jsdoc');
        }

        this.server.notifyJSDocComputed();
        this.countRequested = 0;
        if (error) {
            throw error
        }
        return this.autoOpenBrowser && this.openBrowser(false);
    }

    private async runJsDoc(source : string) {
        return runJsDoc({
            destination : this.root, 
            conf: this.confFile, 
            outputChannel: this.outputChannel, 
            source, 
            tutorials : this.tutorials
        })
        //outputs && outputs.forEach(this.outputChannel.appendLine.bind(this.outputChannel))
    }

    // #endregion

}
