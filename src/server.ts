'use strict';
import * as fs from 'fs';
import * as htmlparser from 'node-html-parser';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as vscode from 'vscode';

interface IServerOptions {
    root: string;
}

function toFile(root, url) {
    switch (url) {
        case '/':
            return path.join(root, 'index.html');
        case '/styles/preview-jsdoc.css':
            return path.join(__dirname, '..', 'static', 'styles.css');
        case '/scripts/preview-jsdoc/preview-js-doc.js':
            return path.join(__dirname, '..', 'static', 'script.js');
        default:
            return path.join(root, decodeURI(url));
    }
}

function formatFile(file: string) {
    if (!fs.existsSync(file)) {
        file = path.join(__dirname, '..', 'static', 'tmp.html');
    }
    const data = fs.readFileSync(file).toString();
    if (!file.endsWith('.html')) {
        return data;
    }
    const root = htmlparser.parse(data) as htmlparser.HTMLElement;
    const head = root.querySelector('head') as htmlparser.HTMLElement;
    head.appendChild(new htmlparser.HTMLElement('link', {},
        'type="text/css" rel="stylesheet" href="styles/preview-jsdoc.css"'));
    head.appendChild(new htmlparser.HTMLElement('script', {}, 'src="/socket.io/socket.io.js"'));
    head.appendChild(new htmlparser.HTMLElement('script', {}, 'src="/scripts/preview-jsdoc/preview-js-doc.js"'));
    return root.toString();
}

async function getAvailablePort(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        portfinder.getPort((err, port) => {
            if (err) {
                reject(err);
            } else {
                resolve(port);
            }
        });
    });
}
export default class Server {

    public readonly app: any;
    public readonly io: any;
    public readonly http: any;
    public sockets: any;
    public currentRoot: string;
    public currentPort: number;

    constructor(private options: IServerOptions) {
        this.app = require('express')();
        this.http = require('http').Server(this.app);
        this.io = require('socket.io')(this.http);
        this.currentRoot = options.root;
    }

    private get url() {
        return `http://localhost:${this.currentPort}`;
    }

    public async run() {
        const port = await getAvailablePort();
        return this.build(port);
    }

    public async build(port: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.currentPort = port;
            this.app.get('*', this.handleRequest);
            this.sockets = {};
            let nextSocketId = 0;
            this.http.on('error', (e) => {
                reject(e);
            });
            this.http.on('connection', (socket) => {
                const socketId = nextSocketId++;
                this.sockets[socketId] = socket;
                socket.on('close', () => { delete this.sockets[socketId]; });
            });
            this.http.listen(port, () => resolve(this.url));
        });
    }

    public setCurrentRoot(newRoot) {
        this.currentRoot = newRoot;
    }

    public notifyJSDocWillComputed() {
        this.emit('onWillJsDocComputed');
    }
    public notifyJsDocLogInfo(message) {
        this.emit('onDidJsDocLogInfo', message);
    }
    public notifyJsDocLogError(message) {
        this.emit('onDidJsDocLogError', message);
    }
    public notifyJSDocComputed() {
        this.emit('onDidJsDocComputed');

    }
    public hasActiveConnection() {
        return Object.keys(this.sockets).length > 0;
    }
    public close() {
        this.io.close();
        Object.keys(this.sockets).forEach((socketId) => this.sockets[socketId].destroy());
        this.http.close();
    }

    private emit(key, value = '') {
        this.io.emit('reload-jsdoc', `${key}: ${value}`);
    }
    private handleRequest = (req, res) => {
        const file = path.resolve(toFile(this.currentRoot, req.url));
        res.send(formatFile(file));

    }
}
