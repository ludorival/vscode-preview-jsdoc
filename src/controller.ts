'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { runJsDoc } from './jsdoc';
import Server from './server';
import { mkdir, openUrl, timer } from './utils';

const ACCEPTED_EXT = ['.js', '.jsx', '.md', '.json'];
interface IChangedConfiguration {
    output?: boolean;
}
export class JsdocController {

    // #endregion

    // #region getters

    get output() {
        const { getConfiguration, getWorkspaceFolder, workspaceFolders } = vscode.workspace;
        const output = getConfiguration('previewjsdoc').get<string>('output') || this.storagePath;
        const workspaceFolder = getWorkspaceFolder(vscode.Uri.file(output)) || workspaceFolders[0];
        return path.isAbsolute(output) ? output : path.join(workspaceFolder.uri.fsPath, output);
    }

    get root() {
        return path.join(this.output, 'www');
    }

    get confFile() {
        return vscode.workspace.getConfiguration('previewjsdoc').get<string>('confFile');
    }

    get tutorials() {
        return path.join(this.output, 'tutorials');
    }

    get autoOpenBrowser() {
        return vscode.workspace.getConfiguration('previewjsdoc').get<boolean>('autoOpenBrowser');
    }

    public readonly server: Server;
    public countRequested: number = 0;
    public outputChannel: vscode.OutputChannel;
    public forceOpenBrowser: boolean = false;
    public serverUrl: string;
    public settingsHasChangedFor: IChangedConfiguration = {};

    constructor(private storagePath: string) {
        this.outputChannel = vscode.window.createOutputChannel('PreviewJsDoc');
        this.server = new Server({
            root: this.root,
        });

    }

    public startServer() {
        this.server.run().then((url) => {
            this.serverUrl = url;
            if (this.forceOpenBrowser) {
                return this.openBrowser();
            }
        }, () => {
            vscode.window.showErrorMessage('The server cannot be run, the extension will not works correctly');
        });
    }

    public dispose() {
        this.server.close();
    }

    // #region commands
    public async openBrowser(forceOpenBrowser: boolean = true, currentSource?: string) {
        if (!this.serverUrl) {
            vscode.window.showInformationMessage('The server has not started. Please wait a moment ...');
            this.forceOpenBrowser = true;
            return;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return vscode.window.showErrorMessage('There is no opening workspace');
        }
        const shouldNotOpen = !(forceOpenBrowser || !this.server.hasActiveConnection());
        openUrl(this.serverUrl, shouldNotOpen);
        await timer(500);
        await this.safeRunJsDoc(currentSource || vscode.window.activeTextEditor ?
                vscode.window.activeTextEditor.document.fileName :
                workspaceFolders[0].uri.fsPath);
    }
    // #endregion

    // #region events

    public async onDidChangeConfiguration(e: vscode.ConfigurationChangeEvent) {

        if (e && !e.affectsConfiguration('previewjsdoc')) {
            return;
        }
        this.settingsHasChangedFor.output = e.affectsConfiguration('previewjsdoc.output');
    }

     public onDidSaveTextDocument(e: vscode.TextDocument) {
        if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName !== e.fileName) {
            // the current saved document is not the active document ignore it
            return;
        }
        if (!this.autoOpenBrowser) {
            return;
        }
        this.openBrowser(false, e.uri.fsPath).catch(this.onError);
    }

    public async setUpIfNeeded() {

        const outputExists = fs.existsSync(this.output);
        const tutorialsExists = fs.existsSync(this.tutorials);
        const jsdocConfExists = fs.existsSync(this.confFile);
        if (!outputExists) {
            await mkdir(this.output);
        }
        if (!tutorialsExists) {
            await mkdir(this.tutorials);
        }

        await this.updateJsDocConfig();

        if (this.settingsHasChangedFor.output) {
            this.server.setCurrentRoot(this.output);
        }

    }

    private onError = (error) => {
        vscode.window.showErrorMessage(`There is an issue when executing the preview jsdoc.
        Check the output for more information`);
    }
    // #endregion

    // #region JsDoc
    private async updateJsDocConfig() {
        if (this.confFile) {
            return;
        }
        const configuration = vscode.workspace.getConfiguration('previewjsdoc');
        const jsdocConfig = configuration.get('conf');

        if (jsdocConfig) {
            vscode.window.showWarningMessage(
                `The setting previewjsdoc.conf is deprecated, it will be replaced by previewjsdoc.confFile instead`);
            const json = JSON.parse(JSON.stringify(jsdocConfig));
            const confFile = path.join(this.output, 'conf.json');
            fs.writeFile(confFile, JSON.stringify(json, null, 2));
            await configuration.update('conf', null);
            await configuration.update('confFile', confFile);
        }

    }

    private async safeRunJsDoc(source: string) {
        if (this.countRequested > 0) {
            this.countRequested += 1;
            return;
        }

        let error;
        try {
            this.server.notifyJSDocWillComputed();
            await this.setUpIfNeeded();
            this.countRequested += 1;
            await this.runJsDoc(source);
            this.countRequested -= 1;
            if (this.countRequested > 0) {
                // chained save events
                await this.runJsDoc(source);
            }
            this.server.notifyJSDocComputed();
        } catch (err) {
            error = err || new Error('Error when running jsdoc');
        }
        this.countRequested = 0;
        if (error) {
            throw error;
        }
    }

    private async runJsDoc(source: string) {
        return runJsDoc({
            destination : this.root,
            conf: this.confFile,
            onLogInfo : this.onLogInfo,
            onLogError : this.onLogError,
            source,
            tutorials : this.tutorials,
        });
    }

    private onLogInfo = (message) => {
        this.outputChannel.appendLine(message);
        this.server.notifyJsDocLogInfo(message);
    }

    private onLogError = (message) => {
        this.outputChannel.show();
        this.outputChannel.appendLine(message);
        this.server.notifyJsDocLogError(message);
    }

    // #endregion

}
