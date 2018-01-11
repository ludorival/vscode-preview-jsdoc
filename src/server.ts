'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface ServerOptions {
    root : string,
    port : number
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


        app.get('*', function(req,res) {
            const url = req.url === '/' ? 'index.html' : req.url;
            let file = path.resolve(path.join(options.root, url));
            if (fs.existsSync(file)) {
                res.sendFile(file)
            } else {
                res.status(404).send("Not Found")
            }
        })

        this.sockets = {};
        var nextSocketId = 0;
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