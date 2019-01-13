import { resolve } from "path";
import * as copyfiles from 'copyfiles';
const mkdirp = require('mkdirp');

export async function mkdir(dir) {
    return new Promise((resolve, reject) => {
        mkdirp(dir, (err) => err ? reject(err) : resolve())
    })
}

export async function copyFiles({sources ,destination} : {sources : string[], destination : string}) {
    return new Promise((resolve, reject) => {
        copyfiles(sources.concat(destination), true, (err, file) => {
            if (err) {
                reject(err);
            } else {
                resolve(file);
            }
        });
    })
}

export async function timer(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeout);
    })
}

