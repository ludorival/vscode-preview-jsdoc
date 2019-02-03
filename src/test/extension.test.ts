//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as fs from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { JsdocController } from '../controller';
import * as myextension from '../extension';
import * as jsdoc from '../jsdoc';
import * as utils from '../utils';

const { timer } = utils;
const deleteFolderRecursive = (p) => {
    if (fs.existsSync(p)) {
        fs.readdirSync(p).forEach((file, index) => {
            const curPath = p + '/' + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(p);
    }
};

const spyRunJsdoc = sinon.spy(jsdoc, 'runJsDoc');
const spyExtensionActivate = sinon.spy(myextension, 'activate');
const spySpawnJsdoc = sinon.spy(utils, 'spawnJsdoc');
const spyOpenUrl = require('opn');

let stubOutputChannel;

const getCurrentWorkspace = () => vscode.workspace.workspaceFolders[0].uri.fsPath;
const initialize = async () => {
    spyRunJsdoc.resetHistory();
    spyOpenUrl.resetHistory();
    spySpawnJsdoc.resetHistory();
    const jsdocController = myextension.getController();
    if (jsdocController) jsdocController.server.sockets = {};
    deleteFolderRecursive(path.join(__dirname, '..', '..', 'example', 'out'));
    deleteFolderRecursive(path.join(__dirname, '..', '..', 'example', 'out2'));
    const configuration = vscode.workspace.getConfiguration('previewjsdoc');
    await configuration.update('tutorials', []);
    await configuration.update('autoOpenBrowser', true);
    await configuration.update('confFile', null);
    await configuration.update('conf', null);
    return configuration.update('output', 'out');
};

const openAFile = async (fileName: string = 'point.js') => {
    const currentWs = vscode.workspace.workspaceFolders[0];
    const document = await vscode.workspace.openTextDocument(path.join(currentWs.uri.fsPath, fileName));
    await vscode.window.showTextDocument(document);
    await timer(2000);
    return document;
};

const saveAFile = async (fileName: string = 'point.js') => {
    const document = await openAFile(fileName);
    await vscode.window.activeTextEditor.edit((editBuilder) =>
        editBuilder.replace(new vscode.Range(new vscode.Position(1, 3), new vscode.Position(1, 33)),
            'Class representing a point'));
    await document.save();
    await timer(4000);
};

const updateConfig = async (configKey, value) => {
    const configuration = vscode.workspace.getConfiguration('previewjsdoc');
    return configuration.update(configKey, value);
};

const emulateActiveConnection = () => {
    const jsdocController = myextension.getController();
    jsdocController.server.sockets[0] = sinon.stub();
}

const cmdOpenBrowser = () => (vscode.commands.executeCommand('previewjsdoc.openBrowser'));

interface IExpectOptions {
    destination: string,
    sourceDirectory?: string,
    confFile? : string,
    withPrivate? : boolean,
    tutorials? : string
}
const normalizeFsPath = fsPath => {
	const sampleFsPath = getCurrentWorkspace();
	const isUnixStyle = sampleFsPath.includes("/");
	return isUnixStyle ? fsPath.replace(/\\/gi, "/") : fsPath.replace(/\//gi, "\\");
};
const expectJsdocCommand = (options : IExpectOptions) => {
    options.withPrivate = !!options.withPrivate
    options.tutorials = options.tutorials;
    options.confFile = options.confFile;
    const arg = {root : vscode.workspace.workspaceFolders[0].uri.fsPath,
        ... options};
    sinon.assert.calledWith(spySpawnJsdoc, arg);
    assert(fs.existsSync(path.join(options.destination, 'index.html')));
}
// Defines a Mocha test suite to group tests of similar kind together
suite('Extension Tests', () => {

    test('should activate the extension when opening a js file', async () => {

        // given
        await initialize();

        // when
        await openAFile();
        // tslint:disable-next-line:no-console
        stubOutputChannel = sinon.stub(myextension.getController().outputChannel, 'appendLine').callsFake(console.warn);
        // then
        assert(spyExtensionActivate.calledOnce);
        assert(!spyRunJsdoc.calledOnce);

    });
    test('should run js doc when opening a browser', async () => {

        // given
        await initialize();

        // when
        await cmdOpenBrowser();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
        
        const currentWs = vscode.workspace.workspaceFolders[0];
        const destination = path.join(currentWs.uri.fsPath, 'out', 'www');
        expectJsdocCommand({destination, sourceDirectory : getCurrentWorkspace()});

    });

    test('should run js doc when opening a file and edit it with any opened browser', async () => {

        // given
        await initialize();

        // when
        await saveAFile();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce, 'a new web page should be opened again');
        const currentWs = vscode.workspace.workspaceFolders[0];
        const destination = path.join(currentWs.uri.fsPath, 'out', 'www');
        expectJsdocCommand({destination, sourceDirectory : getCurrentWorkspace()});

    });

    test('should run js doc when opening a file and edit it with already opened browser', async () => {

        // given
        await initialize();
        emulateActiveConnection();

        // when
        await saveAFile();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(!spyOpenUrl.calledOnce, 'a new web page should not be opened again');      
        const currentWs = vscode.workspace.workspaceFolders[0];
        const destination = path.join(currentWs.uri.fsPath, 'out', 'www');
        expectJsdocCommand({destination, sourceDirectory: getCurrentWorkspace()});

    });

    test('should run js doc with an absolute output when opening a browser', async () => {

        // given
        await initialize();
        const currentWs = vscode.workspace.workspaceFolders[0];
        const newOutput = path.join(currentWs.uri.fsPath, 'out2');
        await updateConfig('output', newOutput);

        // when
        await cmdOpenBrowser();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
        expectJsdocCommand({destination: path.join(newOutput, 'www'), sourceDirectory: getCurrentWorkspace()});

    });

    test('should run js doc with defined a list of tutorials to copy when opening a browser', async () => {

        // given
        await initialize();
        const currentWs = vscode.workspace.workspaceFolders[0];
        const destination = path.join(currentWs.uri.fsPath, 'out', 'www');
        const tutorialsOutput = path.join(destination,'..', 'tutorials');
        await updateConfig('tutorials', ['**/tutorials/*']);

        // when
        await cmdOpenBrowser();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
        expectJsdocCommand({destination, tutorials : tutorialsOutput, sourceDirectory : getCurrentWorkspace()});
        assert(fs.existsSync(path.join(tutorialsOutput, 'tutorial1.md')));
        assert(fs.existsSync(path.join(tutorialsOutput, 'tutorial2.md')));

    });

    test('should not open the browser if autoOpenBrowser is false when save a supported file', async () => {

        // given
        await initialize();
        await updateConfig('autoOpenBrowser', false);

        // when
        await saveAFile();

        // then
        assert(!spyRunJsdoc.calledOnce);
        assert(!spyOpenUrl.calledOnce);

    });

    test('should open the browser if autoOpenBrowser is false when request to open the browser', async () => {

        // given
        await initialize();
        await updateConfig('autoOpenBrowser', false);
        const destination = path.join(getCurrentWorkspace(), 'out', 'www');

        // when
        await cmdOpenBrowser();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
        
        expectJsdocCommand({destination, sourceDirectory: getCurrentWorkspace()});

    });

    test('an other instance should work if a server is already opened', async () => {

        // given
        await initialize();
        const jsdocController = new JsdocController('');

        // when
        await jsdocController.openBrowser();
        jsdocController.startServer();
        await timer(1500);

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);

    });

    test('the user has defined configuration file in its setting', async () => {
        // given
        await initialize();
        await updateConfig('confFile', 'jsdoc.conf.json');

        // when
        await cmdOpenBrowser();

        // then
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
    });

    test('the user has defined absolute configuration file in its setting', async () => {
        // given
        await initialize();
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const destination = path.join(workspaceFolder.uri.fsPath, 'out', 'www');
        const confFile = path.join(workspaceFolder.uri.fsPath, 'jsdoc.conf.json');
        await updateConfig('confFile', confFile);

        // when
        await cmdOpenBrowser();

        // then

        expectJsdocCommand({destination, confFile, sourceDirectory : getCurrentWorkspace()});
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
    });

    test('the user has defined a setting for the deprecated previewjsdoc.conf configuration', async () => {
        // given
        await initialize();
        await updateConfig('conf', {
            plugins: [],
            recurseDepth: 10,
            sourceType: 'module',
            tags: {
                allowUnknownTags: true,
                dictionaries: [
                    'jsdoc',
                    'closure',
                ],
            },
            templates: {
                cleverLinks: false,
                monospaceLinks: false,
            },
            opts: {
                encoding: 'utf8',
                recurse: true,
            },
        });

        // when
        await cmdOpenBrowser();

        // then
        assert(!vscode.workspace.getConfiguration('previewjsdoc').get('conf'));
        const confFile = vscode.workspace.getConfiguration('previewjsdoc').get<string>('confFile');
        assert(confFile);
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
        expectJsdocCommand({destination : path.join(getCurrentWorkspace(), 'out', 'www'), 
                            confFile, 
                            sourceDirectory : getCurrentWorkspace()});
    });

    test('the user has defined a setting by pointing the old template layouting', async () => {
        // given
        await initialize();
        await updateConfig('conf', {
            plugins: [],
            recurseDepth: 10,
            sourceType: 'module',
            tags: {
                allowUnknownTags: true,
                dictionaries: [
                    'jsdoc',
                    'closure',
                ],
            },
            templates: {
                cleverLinks: false,
                monospaceLinks: false,
                default: {
                    layoutFile: path.join(__dirname, '..', '..', 'layout.tmpl'),
                },
            },
            opts: {
                encoding: 'utf8',
                recurse: true,
            },
        });

        // when
        await cmdOpenBrowser();

        // then
        const confFile = vscode.workspace.getConfiguration('previewjsdoc').get<string>('confFile');
        assert(confFile);
        const json = JSON.parse(fs.readFileSync(confFile).toString());
        assert(!json.templates.default.layoutFile);
        assert(!vscode.workspace.getConfiguration('previewjsdoc').get('conf'));
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
    });


    test('the browser should not be opened if the user save a non accepted format', async () => {
        // given
        await initialize();

        // when
        await saveAFile('nonSupportedFile.txt');

        // then
        assert(!spyRunJsdoc.calledOnce);
        assert(!spyOpenUrl.called);
    });

    test('should pass source directory when the user has defined configuration file in its setting with include and edits a branching sibling directory', async () => {
        // given an included sub dir
        await initialize();
        await updateConfig('confFile', 'jsdoc.conf.with-include.json');
		
        // when
		await saveAFile("src/sub2/Line.js");
        // then pass the source directory
        assert(spyRunJsdoc.calledOnce);
        assert(spyOpenUrl.calledOnce);
		
        expectJsdocCommand({destination : path.join(getCurrentWorkspace(), 'out', 'www'), 
                            confFile : 'jsdoc.conf.with-include.json', 
                            sourceDirectory : normalizeFsPath(`${getCurrentWorkspace()}/src/sub2`)});
	});
	
	test('should not pass source directory when the user has defined configuration file in its setting with include and edits a file in a parent folder', async () => {
        // given
        await initialize();
        await updateConfig('confFile', 'jsdoc.conf.with-include.json');
		
		// when
		await saveAFile("point.js");
		
		// then dont pass source directory in cli
		expectJsdocCommand({destination : path.join(getCurrentWorkspace(), 'out', 'www'), 
                            confFile : 'jsdoc.conf.with-include.json', 
                            sourceDirectory : undefined});
	});
	
	test('should not pass source directory when the user has defined configuration file in its setting with include and edits a file in a sub folder', async () => {
        // given
        await initialize();
		await updateConfig('confFile', 'jsdoc.conf.with-include-parent.json');
		
		// when 
		await saveAFile("src/sub2/Line.js");
		// then dont pass source directory in cli
		expectJsdocCommand({destination : path.join(getCurrentWorkspace(), 'out', 'www'), 
                            confFile : 'jsdoc.conf.with-include-parent.json', 
                            sourceDirectory : undefined});
		
	});
	
	test('should not pass source directory when the user has defined configuration file in its setting with include and edits a file in the same folder', async () => {
        // given
        await initialize();
		await updateConfig('confFile', 'jsdoc.conf.with-include-parent.json');
		
		// when 
		await saveAFile("src/Circle.js");
		// then dont pass source directory in cli
		expectJsdocCommand({destination : path.join(getCurrentWorkspace(), 'out', 'www'), 
                            confFile : 'jsdoc.conf.with-include-parent.json', 
                            sourceDirectory : undefined});
	});
});
