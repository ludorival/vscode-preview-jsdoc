Simply preview your jsdoc generation on your browser.

![screencast](./vscode-preview-jsdoc.gif)
## Features

Each time a *.js or *.md file is saved, jsdoc is launched on its parent directory and the preview page is automatically reloaded (or opened if not exist).

You can open a new page in your browser with the command `Preview JSDoc : Open browser`. 

## Requirements

You need to install jsdoc on your machine

    npm install -g jsdoc

More info, go to http://www.usejsdoc.org.

## Extension Settings


This extension contributes the following settings:

* `previewjsdoc.autoOpenBrowser`: enable/disable the auto opening of the browser at the first save.
* `previewjsdoc.port`: Change the port where the jsdoc server runs. Default is 3001. 
* `previewjsdoc.conf`: the complete JSON configuration passed to `jsdoc -c conf.json`. More details on http://usejsdoc.org/about-configuring-jsdoc.html
* `previewjsdoc.tutorials`: set a list paths which may contain jsdoc tutorials. A glob pattern or relative path are possible to use. This list will be merged into a single tutorial folder and will be passed to `jsdoc -t`. For example
```json
    "previewjsdoc.tutorials" : ["**/tutorials/*"] // copy all folders containing tutorials as child folder.
```
* `previewjsdoc.output`: set the output where the extension generates the conf.json, the root directory to store jsdoc generated files and the merged tutorials folder

## Known Issues

On Mac, the command open http://localhost:3001 do not work when chrome is the default browser, so safari is used instead.


## Release Notes

### 1.0.0

Initial release

## Others

This extension has been inspired from [Instant Markdown](https://github.com/dbankier/vscode-instant-markdown) extension.

