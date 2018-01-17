'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ServerOptions {
    root : string,
    port : number,
    outputChannel : vscode.OutputChannel,
    onDidStart : () => void
}
export default class Server {

    io:any;
    http:any;
    sockets: any;

    constructor(options:ServerOptions) {
        const app = require('express')();
        const http = require('http').Server(app);
        const io = require('socket.io')(http);

        const toFile = (url) => {
            switch (url) {
                case '/':
                    return path.join(options.root, 'index.html');
                case '/styles/preview-jsdoc.css':
                    return path.join(__dirname, '..', 'styles.css');
                default:
                    return path.join(options.root, url);
            }
        }
        app.get('*', function(req,res) {

            let file = path.resolve(toFile(req.url));
            if (fs.existsSync(file)) {
                res.sendFile(file)
            } else if (req.url === '/') {
                res.sendFile(path.join(__dirname, '..', 'tmp.html'));
            } else {
                res.status(404).send("Not Found")
            }
        })

        this.sockets = {};
        var nextSocketId = 0;
        http.on('error', async (e) => {
            if (e.code === 'EADDRINUSE') {
               const result = await vscode.window.showWarningMessage(`The port ${options.port} is already in use. Please change the port in the setting previewjsdoc.port !`, 'Open settings');
               if (result) {
                   // open settings
                   await vscode.commands.executeCommand('workbench.action.openWorkspaceSettings');
               }
            }
            options.outputChannel.append( `Error ${e}`);
        });
        http.on('connection', (socket) => {
            var socketId = nextSocketId++;
            this.sockets[socketId] = socket;
            socket.on('close',  () => { delete this.sockets[socketId]; });
        });

        http.listen(options.port, function(){
            console.log('listening on *:' + options.port);
            options.onDidStart();
        });

        this.io = io;
        this.http = http;
    }
    notifyJSDocWillComputed() {
       this.io.emit('reload-jsdoc', 'onWillJsDocComputed');
    }

    notifyJSDocComputed() {
        this.io.emit('reload-jsdoc', 'onDidJsDocComputed');
    }
    close() {
        this.io.close()
        for (var socketId in this.sockets) {
            console.log('socket', socketId, 'destroyed');
            this.sockets[socketId].destroy();
        }
        this.http.close(function() {;
            console.log("stopped")
        });
    }
}