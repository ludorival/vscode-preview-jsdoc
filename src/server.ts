'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as portfinder from 'portfinder';
import * as htmlparser from 'node-html-parser';
interface ServerOptions {
    root : string,
    port : number,
    onDidStart : () => void
}

function toFile(root, url) {
    switch (url) {
        case '/':
            return path.join(root, 'index.html');
        case '/styles/preview-jsdoc.css':
            return path.join(__dirname, '..', 'styles.css');
        case '/scripts/preview-jsdoc/preview-js-doc.js':
            return path.join(__dirname, '..', 'script.js');
        default:
            return path.join(root, url);
    }
}

function formatFile(file : string) {
    const data = fs.readFileSync(file).toString();
    if (!file.endsWith('.html')) {
        return data;
    } 
    const root = htmlparser.parse(data);
    const head = root.querySelectorAll('head')[0] as htmlparser.HTMLElement;
    head.appendChild(new htmlparser.HTMLElement('link', {}, 'type="text/css" rel="stylesheet" href="styles/preview-jsdoc.css"'))
    head.appendChild(new htmlparser.HTMLElement('script', {}, 'src="/socket.io/socket.io.js"'))
    head.appendChild(new htmlparser.HTMLElement('script', {}, 'src="/scripts/preview-jsdoc/preview-js-doc.js"'))
    return root.toString();
    
}
export default class Server {

    readonly app: any;
    readonly io:any;
    readonly http:any;
    sockets: any;
    currentRoot: string;
    currentPort: number;

    constructor(private options:ServerOptions) {
        this.app = require('express')();
        this.http = require('http').Server(this.app);
        this.io = require('socket.io')(this.http);
        this.currentRoot = options.root;


        portfinder.getPortPromise({startPort : options.port, stopPort : options.port + 1000}).then((port) => {
            console.log(`the port is available`);
            return this.build(port);
        }, (err) => {
            // all ports are avalaible, can start with the first port
            return this.build(options.port);

        })
    }

    get url() {
        return `http://localhost:${this.currentPort}`;
    }

    async build(port : number) {
        this.currentPort = port;
        this.app.get('*', (req,res)  => {

            let file = path.resolve(toFile(this.currentRoot, req.url));
            if (fs.existsSync(file)) {
                res.send(formatFile(file))
            } else if (req.url === '/') {
                res.sendFile(path.join(__dirname, '..', 'tmp.html'));
            } else {
                res.status(404).send("Not Found")
            }
        })

        this.sockets = {};
        var nextSocketId = 0;
        this.http.on('error', async (e) => {
            console.error(`Error ${e}`);
        });
        this.http.on('connection', (socket) => {
            var socketId = nextSocketId++;
            this.sockets[socketId] = socket;
            socket.on('close',  () => { delete this.sockets[socketId]; });
        });

        this.http.listen(port, () => {
            console.log(`listening on *:${port}`);
            this.options.onDidStart();
        });
    }

    setCurrentRoot(newRoot) {
        this.currentRoot = newRoot;
    }
    
    notifyJSDocWillComputed() {
        try {  
            this.io.emit('reload-jsdoc', 'onWillJsDocComputed');
        } catch (error) {
            console.error(error);
        }
    }

    notifyJSDocComputed() {
        try {  
            this.io.emit('reload-jsdoc', 'onDidJsDocComputed');
        } catch (error) {
            console.error(error);
        }
    }
    close() {
        this.io.close()
        for (let socketId in this.sockets) {
            console.log('socket', socketId, 'destroyed');
            this.sockets[socketId].destroy();
        }
        this.http.close(function() {;
            console.log("stopped")
        });
    }
}