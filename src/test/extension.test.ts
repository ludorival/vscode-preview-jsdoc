//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsdoc from '../jsdoc';
import * as sinon from 'sinon';
import * as portfinder from 'portfinder';
import * as myextension from '../extension';
import { timer } from '../utils';

const deleteFolderRecursive = function(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file, index) => {
        const curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) { // recurse
          deleteFolderRecursive(curPath);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  };
// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {

    const spyRunJsdoc = sinon.spy(jsdoc, 'runJsDoc');
    const spyExtensionActivate = sinon.spy(myextension, 'activate');

    test("should activate the extension when opening a js file", async () => {
       
        // given
        spyRunJsdoc.resetHistory();
        deleteFolderRecursive(path.join(__dirname, '..', '..', 'example', 'out'));

        // when
        const currentWs = vscode.workspace.workspaceFolders[0];
        const document = await vscode.workspace.openTextDocument(path.join(currentWs.uri.fsPath, 'point.js'));
        await vscode.window.showTextDocument(document);

        await timer(2000);
        // then 
        assert(spyExtensionActivate.calledOnce);
        assert(!spyRunJsdoc.calledOnce);
        

    });
    test("should run js doc when opening a browser", async () => {
       
        // given
        spyRunJsdoc.resetHistory();
        deleteFolderRecursive(path.join(__dirname, '..', '..', 'example', 'out'));

        // when
        await vscode.commands.executeCommand('previewjsdoc.openBrowser');

        // then
        assert(spyRunJsdoc.calledOnce);
        const currentWs = vscode.workspace.workspaceFolders[0];
        assert(fs.existsSync(path.join(currentWs.uri.fsPath, 'out', 'www', 'index.html')));
        
    });

    test("should run js doc when opening a file and edit it", async () => {
       
        // given
        spyRunJsdoc.resetHistory();
        deleteFolderRecursive(path.join(__dirname, '..', '..', 'example', 'out'));
        const currentWs = vscode.workspace.workspaceFolders[0];
        const document = await vscode.workspace.openTextDocument(path.join(currentWs.uri.fsPath, 'point.js'));
        // await vscode.window.activeTextEditor.edit((editBuilder) => editBuilder.replace( new vscode.Range(new vscode.Position(2, 4), new vscode.Position(2, 33)), 'Class representing a 2D point'))
        // await document.save();
        await vscode.window.showTextDocument(document);
        await timer(2000);

        // when
        await vscode.window.activeTextEditor.edit((editBuilder) => editBuilder.replace( new vscode.Range(new vscode.Position(1, 3), new vscode.Position(1, 33)), 'Class representing a point'))
        await document.save();
        await timer(2000);
        // then
        assert(spyRunJsdoc.calledOnce);
        assert(fs.existsSync(path.join(currentWs.uri.fsPath, 'out', 'www', 'index.html')));
        
    });

    test("should run js doc when opening a file and edit it", async () => {
       
        // given
        spyRunJsdoc.resetHistory();
        deleteFolderRecursive(path.join(__dirname, '..', '..', 'example', 'out'));
        const currentWs = vscode.workspace.workspaceFolders[0];
        const document = await vscode.workspace.openTextDocument(path.join(currentWs.uri.fsPath, 'point.js'));
        // await vscode.window.activeTextEditor.edit((editBuilder) => editBuilder.replace( new vscode.Range(new vscode.Position(2, 4), new vscode.Position(2, 33)), 'Class representing a 2D point'))
        // await document.save();
        await vscode.window.showTextDocument(document);
        await timer(2000);

        // when
        await vscode.window.activeTextEditor.edit((editBuilder) => editBuilder.replace( new vscode.Range(new vscode.Position(1, 3), new vscode.Position(1, 33)), 'Class representing a point'))
        await document.save();
        await timer(2000);
        // then
        assert(spyRunJsdoc.calledOnce);
        assert(fs.existsSync(path.join(currentWs.uri.fsPath, 'out', 'www', 'index.html')));
        
    });

    
});