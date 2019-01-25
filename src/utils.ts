import * as copyfiles from 'copyfiles';
import * as mkdirp from 'mkdirp';
import * as open from 'opn';
import * as path from 'path';
import * as vscode from 'vscode';
import * as walkBack from 'walk-back';
import * as cp from 'child_process';

const ACCEPTED_EXT = ['.js', '.jsx', '.md', '.json'];

const jsdocPath = walkBack(
    path.join(__dirname, '..'),
    path.join('node_modules', 'jsdoc', 'jsdoc.js'),
  );
export async function mkdir(dir) {
    return new Promise((resolve, reject) => {
        mkdirp(dir, (err) => err ? reject(err) : resolve());
    });
}

export async function copyFiles({sources , destination}: {sources: string[], destination: string}) {
    return new Promise((resolve, reject) => {
        copyfiles(sources.concat(destination), true, (err, file) => {
            if (err) {
                reject(err);
            } else {
                resolve(file);
            }
        });
    });
}

export async function timer(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeout);
    });
}

export function openUrl(url, shouldNotOpen?: boolean) {
    if (shouldNotOpen) {
        return;
    }
    open(url);
}

export function asAbsolutePath({source, root}: {source: string, root: string}) {
    return !source || path.isAbsolute(source) ? source : path.join(root, source);
}


export function getSupportedExtension(source: string) {
    if (source) {
        const extName       = path.extname(source.toLowerCase());
        const relativePath  = vscode.workspace.asRelativePath(vscode.Uri.file(source));
        const ignoreSources = ['.vscode/settings.json'];
        if (ACCEPTED_EXT.includes(extName) && !ignoreSources.includes(relativePath)) {
            return extName;
        }
    }
    return null;
}
export interface ISpawnJsDocOption {
    destination: string,
    root: string,
    sourceDirectory?: string,
    confFile? : string,
    withPrivate? : boolean,
    tutorials? : string
}
export function spawnJsdoc({destination, root, sourceDirectory, 
    confFile, withPrivate, tutorials} : ISpawnJsDocOption) {
    const args = [
        jsdocPath,
        '--verbose',
        '-d',
        `"${destination}"`,
        ...(confFile ? ['-c', `"${confFile}"`] : []),
        ...(withPrivate ? ['-p'] : []),
        ...(tutorials ? ['-u', `"${tutorials}"`] : []),
        ...(sourceDirectory ? [`"${sourceDirectory}"`] : []),
    ];
    return {spawn : cp.spawn('node', args, {shell : true, cwd : `${root}`}),
            args};
    
}