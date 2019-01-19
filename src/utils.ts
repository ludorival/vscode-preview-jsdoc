import * as copyfiles from 'copyfiles';
import * as mkdirp from 'mkdirp';
import * as open from 'opn';
import * as path from 'path';
import * as vscode from 'vscode';

const ACCEPTED_EXT = ['.js', '.jsx', '.md', '.json'];
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
    return path.isAbsolute(source) ? source : path.join(root, source);
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