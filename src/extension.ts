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
const copyfiles = require('copyfiles');

const ACCEPTED_EXT = ['.js','.jsx', '.md', '.json'];

class JsdocController {

    server: Server;
    countRequested : number = 0;
    sourceUri : vscode.Uri;
    opened : boolean;
    outputChannel : vscode.OutputChannel;
    constructor(private storagePath : string) {
        // create the storage path if not exist
        const output = this.output;

        this.outputChannel = vscode.window.createOutputChannel('PreviewJsDoc');
        // force the change of configuration to create output directory and conf if need
        this.onDidChangeConfiguration({affectsConfiguration : (section, uri)=> {
            return ['previewjsdoc', 'previewjsdoc.output', 'previewjsdoc.conf'].indexOf(section) >=0;
        }});

        
    }

    async openBrowser() {
        //
        const port  = vscode.workspace.getConfiguration('previewjsdoc').get<number>('port');
        const url = `http://localhost:${port}`;
        this.opened = true;
        setTimeout(() => {
            this.protectedRunJsDoc();
        }, 1000);
        return open(url, { app : process.platform === 'darwin' ? 'safari' : null});
        
        
    }

    async onDidServerStart() {
        if (vscode.workspace.getConfiguration('previewjsdoc').get<boolean>('autoOpenBrowser')) {
            return this.openBrowser();
        }


    };
    get output() {
        return vscode.workspace.getConfiguration('previewjsdoc').get<string>('output') || this.storagePath;
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

    onDidChangeConfiguration(e : vscode.ConfigurationChangeEvent) {
        
        if (e && !e.affectsConfiguration('previewjsdoc')) {
            return;
        }
        const updateOutput = e.affectsConfiguration('previewjsdoc.output');
        const updatePort = e.affectsConfiguration('previewjsdoc.port');
        const updateConf = e.affectsConfiguration('previewjsdoc.conf');

        if (updateOutput) {
            // create directory if necessary
            if (!fs.existsSync(this.output)) {
                fs.mkdirSync(this.output);
                // create tutorials
                fs.mkdirSync(this.tutorials);
            }
        }
        if (updateConf) {
            // change the conf to override the default layout template
            const jsdocConfig : { opts : any, templates : any} = vscode.workspace.getConfiguration('previewjsdoc').get('conf');
            jsdocConfig.templates = jsdocConfig.templates || {}
            jsdocConfig.templates.default = {
                layoutFile : path.resolve(__dirname, '..', 'layout.tmpl')
            };
            fs.writeFile(this.confFile, JSON.stringify(jsdocConfig, null, 2));
        }
        if (this.server && (updatePort || updateOutput)) {
            // close the server if the port has changed or the output change
            this.server.close();
            this.server = null;
            this.createServer();
            // open the browser if it was opened
            this.opened && this.openBrowser();
            return;
        }
        // run jsdoc 
        this.runJsDoc();
    }

    private createServer() {
        const port = vscode.workspace.getConfiguration('previewjsdoc').get<number>('port');
        this.server = new Server({
            root : this.root,
            port : port,
            outputChannel : this.outputChannel,
            onDidStart : this.onDidServerStart.bind(this)
        });
    }
    private async mergeTutorials() {
        const tutorials_out = this.tutorials;
        const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(this.sourceUri);
        const outputChannel = this.outputChannel;
        return new Promise((resolve, reject) => {
            
            const tutorials = vscode.workspace.getConfiguration('previewjsdoc').get<string[]>('tutorials');
            if (tutorials.length) {
                outputChannel.appendLine(`Copy tutorials containing in ${tutorials.join(',')} to ${tutorials_out} ...`);
                const resolvedPaths = tutorials.map((p) => {
                    if (path.isAbsolute(p)) {
                        return p;
                    }
                    if (currentWorkspaceFolder) {
                        return path.join(currentWorkspaceFolder.uri.fsPath, p);
                    }
                    return p;
                })
                copyfiles(resolvedPaths.concat(tutorials_out), true, (err, file) => {
                    if (err) {
                        outputChannel.appendLine(`Error when try to merge tutorials !`);
                        reject(err);
                    } else {
                        outputChannel.appendLine(`Copy successful !`);
                        resolve(file);
                    }
                });
               
                
            } else {
                resolve();
            }
        });
        
    }

    get supportedExtension() {
        if (this.sourceUri) {
            const extName = path.extname(this.sourceUri.fsPath.toLowerCase());
            if (ACCEPTED_EXT.indexOf(extName) >= 0) {
                return extName;
            }
        }
        return null;
    }
    async onDidSaveTextDocument(e : vscode.TextDocument) {
       if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.fileName !== e.fileName) {
            // the current saved document is not the active document ignore it
            return;
       }
        this.sourceUri = e.uri;
        if (!this.supportedExtension) {
            return;
        }
        if (!this.server) {
            this.createServer();
        } else {
            this.protectedRunJsDoc();
        }
    };

    private async protectedRunJsDoc() {
        if (this.countRequested > 0) {
            this.countRequested += 1;
            return;
        }
        this.countRequested += 1;
        this.server.notifyJSDocWillComputed();
        try {
            await this.runJsDoc();
            this.countRequested -= 1;
            if (this.countRequested > 0) {
                // chained save events
                this.runJsDoc();
            }
        } catch (error) {
        }
       
        this.server.notifyJSDocComputed();
        this.countRequested = 0;
    }


    async runJsDoc() {
        if (!this.sourceUri) {
            return;
        }
        const extName = this.supportedExtension;
        if (!extName) {
            return ;
        }
        
        // if markdown files copy tutorials into a single one
        if (extName === '.md') {
            await this.mergeTutorials();
        }
        const configuration = vscode.workspace.getConfiguration('previewjsdoc');
        const jsdocConf = configuration.get<{ source : { include : string[] }}>('conf');
        let sources = path.resolve(this.sourceUri.fsPath, '..');
        let workspaceFolder = vscode.workspace.getWorkspaceFolder(this.sourceUri);
        // check in the include sources the current file to analyse is not a part of them
        if (jsdocConf.source.include) {
            const find = jsdocConf.source.include.find((value) => {
                const relative = path.relative(path.resolve(value), sources);
                return !relative.startsWith('..');
            });
            if (find) {
                sources = '';
            }
        }
        
         return new Promise((resolve, reject) => {
            let args =  ['-c', `"${this.confFile}"`, `"${sources}"`, '--verbose', '-d', `"${this.root}"`];
            const withPrivate = configuration.get<boolean>('withPrivate');
            if (withPrivate) {
                args.push('-p');
            }
            const overrideTutorials = configuration.get<string[]>('tutorials');
            if (overrideTutorials && overrideTutorials.length) {
                args.push('-u');
                args.push(`${this.tutorials}`);
            }
            const spawn = cp.spawn('jsdoc', args, {shell : true, cwd : `${workspaceFolder.uri.fsPath}`});
            this.outputChannel.appendLine(`Execute the command line \n \tjsdoc ${args.join(' ')}`);
            spawn.stdout.on('data', (data) => {
                this.outputChannel.append(data.toString());
              });
              
              spawn.stderr.on('data', (data) => {
                this.outputChannel.append(data.toString());
              });
              
              spawn.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error('Check output channel'));
                }
              });
         })
    }

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let jsdocController = new JsdocController(context.storagePath);
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
}