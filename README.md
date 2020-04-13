[![Build Status](https://travis-ci.org/ludorival/vscode-preview-jsdoc.svg?branch=master)](https://travis-ci.org/ludorival/vscode-preview-jsdoc)

Simply preview your jsdoc generation on your browser.

![screencast](./vscode-preview-jsdoc.gif)
## Features

Each time a *.js or *.md file is saved, jsdoc is launched on its parent directory and the preview page is automatically reloaded (or opened if not exist).

You can open a new page in your browser with the command `Preview JSDoc : Open browser`. 

> No need to have jsdoc installed on your machine.

## Extension Settings


This extension contributes the following settings:

* `previewjsdoc.autoOpenBrowser`: enable/disable the auto opening of the browser at the first save.
* `previewjsdoc.confFile`: the JSON configuration file passed to `jsdoc -c confFile.json`. More details on http://usejsdoc.org/about-configuring-jsdoc.html
* `previewjsdoc.tutorials`: set a list paths which may contain jsdoc tutorials. A glob pattern or relative path are possible to use. This list will be merged into a single tutorial folder and will be passed to `jsdoc -t`. For example
```json
    "previewjsdoc.tutorials" : ["**/tutorials/*"] // copy all folders containing tutorials as child folder.
```
* `previewjsdoc.output`: set the output where the extension generates the conf.json, the root directory to store jsdoc generated files and the merged tutorials folder

## Use a custom templates
If you want to use a different template than the default one. You can set in your configuration file the location of this template.

For example, if you want to use the template [fooDoc](https://www.npmjs.com/package/foodoc). 
1. Get the absolute path where you installed this template.
2. Update the configuration file like below
```json
{
    "opts": {
        ...
        "template": "<root path>/node_modules/foodoc/template"
    }
}
```
3. Open the preview jsdoc browser or save a file to see the new template

## Release Notes

Look at the [Changelog](./CHANGELOG.md)


## Others

This extension has been inspired from [Instant Markdown](https://github.com/dbankier/vscode-instant-markdown) extension.
