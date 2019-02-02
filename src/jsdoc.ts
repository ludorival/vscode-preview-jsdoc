import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { asAbsolutePath, copyFiles, spawnJsdoc } from './utils';





function asIncludedInSource({source, root, sources}: {
    source: string, root: string, sources: string[]}): string | undefined {

    const absolutePaths = sources.map((value) => asAbsolutePath({source: value, root}));
    const sourceIsASibling = !absolutePaths.find((absolutePath) => absolutePath.indexOf(source) === 0 || source.indexOf(absolutePath) === 0);

    return sourceIsASibling ? source : undefined;
}

interface IJsDocOptions {
    source: string;
    destination: string;
    conf: string;
    tutorials: string;
    onLogInfo: (message: string) => void;
    onLogError: (message: string) => void;
    workspaceFolder?: vscode.WorkspaceFolder;
}
export async function runJsDoc(options: IJsDocOptions) {
    const { source, destination, conf, tutorials, onLogInfo, onLogError } = options;
    if (!source) {
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(source));
    if (!workspaceFolder) {
        onLogError(`the current source ${source} does not belong to any workspace`);
        return;
    }

    await mergeTutorials({workspaceFolder, ...options});
    const configuration     = vscode.workspace.getConfiguration('previewjsdoc');
    const withPrivate       = configuration.get<boolean>('withPrivate');
    const overrideTutorials = configuration.get<string[]>('tutorials');
    const jsdocConf         = checkAndGetJsDocConf(conf, workspaceFolder.uri.fsPath);
    const sourceDirectory   = asIncludedInSource({
        source :  path.resolve(source, '..'),
        root : workspaceFolder.uri.fsPath,
        sources : jsdocConf.json.source.include || []});
    return executeCommand({
        workspaceFolder,
        onLogInfo,
        onLogError,
        configure: jsdocConf.confFileExist ? conf : undefined,
        destination,
        withPrivate,
        sourceDirectory,
        ...(overrideTutorials && overrideTutorials.length && { tutorials }),
    });

}

function checkAndGetJsDocConf(confFile, root): {json: any, confFileExist: boolean} {
    const absoluteConfFile = asAbsolutePath({source : confFile, root});
    if (absoluteConfFile && fs.existsSync(absoluteConfFile)) {
        const json = JSON.parse(fs.readFileSync(absoluteConfFile).toString());
        if (json.templates &&
            json.templates.default &&
            json.templates.default.layoutFile &&
            path.resolve(json.templates.default.layoutFile) === path.resolve(__dirname, '..', 'layout.tmpl')) {
                delete json.templates.default.layoutFile;
                fs.writeFileSync(confFile, JSON.stringify(json, null, 2));
            }
        return { json : {source : {}, ...json}, confFileExist : true};
    }
    confFile && vscode.window.showInformationMessage(`the jsdoc configuration file does not exist : ${confFile}`);
    return {json : {source : {}}, confFileExist : false};
}
async function mergeTutorials({ source, tutorials, onLogError, onLogInfo, workspaceFolder }: IJsDocOptions) {
    const sourceTutorials = vscode.workspace.getConfiguration('previewjsdoc').get<string[]>('tutorials');

    if (sourceTutorials.length) {
        onLogInfo(`Copy tutorials containing in ${sourceTutorials.join(',')} to ${tutorials} ...`);
        const sources = sourceTutorials.map((p) => asAbsolutePath({source : p, root : workspaceFolder.uri.fsPath}) );
        try {
            await copyFiles({sources, destination : tutorials});
            onLogInfo('++ Done');
        } catch (error) {
            onLogError(`-- Error ${error}`);
        }

    }

}

async function executeCommand(
    {workspaceFolder, configure, destination, withPrivate, sourceDirectory, tutorials, onLogInfo, onLogError}) {
    return new Promise((resolve, reject) => {
        const {spawn, args} = spawnJsdoc({destination, root: workspaceFolder.uri.fsPath, sourceDirectory, confFile : configure, tutorials, withPrivate})
        onLogInfo(`Execute the command line`);
        onLogInfo(`\tjsdoc ${args.join(' ')}`);
        spawn.stdout.on('data', (data) => {
            onLogInfo(data.toString());
          });

        spawn.stderr.on('data', (data) => {
            onLogError(data.toString());
          });

        spawn.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                onLogError('Command failed !');
                reject(new Error('Check output channel'));
            }
          });
     });
}
