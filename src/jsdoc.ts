import * as vscode from 'vscode';
import * as path from 'path';
import * as jsdoc from 'jsdoc-api';
import * as cp from 'child_process';
import { copyFiles } from './utils';
import * as walkBack from 'walk-back';

const ACCEPTED_EXT = ['.js', '.jsx', '.md', '.json'];

const jsdocPath = walkBack(
      path.join(__dirname, '..'),
      path.join('node_modules', 'jsdoc', 'jsdoc.js')
    )

function getSupportedExtension(source: string) {
    if (source) {
        const extName       = path.extname(source.toLowerCase());
        const relativePath  = vscode.workspace.asRelativePath(vscode.Uri.file(source))
        const ignoreSources = ['.vscode/settings.json']
        if (ACCEPTED_EXT.includes(extName) && !ignoreSources.includes(relativePath)) {
            return extName;
        }
    }
    return null;
}

function asAbsolutePath({source, root} : {source: string, root : string}) {
    return path.isAbsolute(source) ? source : path.join(root, source)
}

function asIncludedInSource({source, root, sources} : {source: string, root: string, sources: string[]}): string | undefined {
    const find = sources.map(value => asAbsolutePath({source: value, root}))
                        .map(absolutePath => path.relative(absolutePath, source))
                        .find(relativePath => !relativePath.startsWith('..'))
    return find ? undefined : source
}

interface JsDocOptions {
    source: string,
    destination: string,
    conf: string,
    tutorials: string,
    outputChannel: vscode.OutputChannel,
    workspaceFolder?: vscode.WorkspaceFolder
}
export async function runJsDoc(options: JsDocOptions) {
    const { source, destination, conf, tutorials, outputChannel } = options;
    if (!source) {
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(source));
    if (!workspaceFolder) {
        outputChannel.appendLine(`the current source ${source} does not belong to any workspace`);
        return;
    }

    await mergeTutorials({workspaceFolder, ...options});
    const configuration     = vscode.workspace.getConfiguration('previewjsdoc');
    const jsdocConf         = configuration.get<{ source: { include: string[] } }>('conf');
    const withPrivate       = configuration.get<boolean>('withPrivate');
    const overrideTutorials = configuration.get<string[]>('tutorials');
    const sourceDirectory   = asIncludedInSource({
        source :  path.resolve(source, '..'), 
        root : workspaceFolder.uri.fsPath, 
        sources : jsdocConf.source.include || []});
    return executeCommand({
        workspaceFolder,
        outputChannel,
        configure: conf,
        destination,
        withPrivate,
        sourceDirectory,
        ...(overrideTutorials && overrideTutorials.length && { tutorials })
    })
    // return jsdoc.explain({
    //     configure: conf,
    //     destination,
    //     ...(withPrivate && {private : true}),
    //     ...(sourceDirectory && { files: [sourceDirectory] }),
    //     ...(overrideTutorials && overrideTutorials.length && { tutorials })
    // })

}

 async function mergeTutorials({ source, tutorials, outputChannel, workspaceFolder }: JsDocOptions) {
    if (getSupportedExtension(source) !== '.md') {
        return;
    }
    const sourceTutorials = vscode.workspace.getConfiguration('previewjsdoc').get<string[]>('tutorials');

    if (sourceTutorials.length) {
        outputChannel.appendLine(`Copy tutorials containing in ${sourceTutorials.join(',')} to ${tutorials} ...`);
        const sources = sourceTutorials.map(p => asAbsolutePath({source : p, root : workspaceFolder.uri.fsPath}) )
        await copyFiles({sources, destination : tutorials});
    }

}

async function executeCommand({workspaceFolder, configure, destination, withPrivate, sourceDirectory, tutorials, outputChannel}) {
    return new Promise((resolve, reject) => {
        let args =  [jsdocPath, '-c', `"${configure}"`, '--verbose', '-d', `"${destination}"`];
        if (sourceDirectory) {
            args.push(`"${sourceDirectory}"`);
        }
        if (withPrivate) {
            args.push('-p');
        }
        if (tutorials) {
            args.push('-u');
            args.push(`${tutorials}`);
        }
        const spawn = cp.spawn('node', args, {shell : true, cwd : `${workspaceFolder.uri.fsPath}`});
        outputChannel.appendLine(`Execute the command line \n \tjsdoc ${args.join(' ')}`);
        spawn.stdout.on('data', (data) => {
            outputChannel.append(data.toString());
          });
          
          spawn.stderr.on('data', (data) => {
            outputChannel.append(data.toString());
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