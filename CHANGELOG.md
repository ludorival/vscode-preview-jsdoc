## 2.0.8
- Fix issue when there is a space inside the jsdoc file path[#31](https://github.com/ludorival/vscode-preview-jsdoc/issues/31)
- Thanks to fbarda for its contribution

## 2.0.7
- Fix port range starting from 3000 issue [#27](https://github.com/ludorival/vscode-preview-jsdoc/issues/27)

## 2.0.6
- Fix issue [#25](https://github.com/ludorival/vscode-preview-jsdoc/issues/25
- Thanks to Lukas Willin for its contribution 

## 2.0.5
- Fix issue [#22](https://github.com/ludorival/vscode-preview-jsdoc/issues/22)

## 2.0.4
- Quick patch after the 2.0.0 drop

## 2.0.0
- the `previewjsdoc.port` setting does not exist anymore since an available port will be chosen for the jsdoc server
- the `previewjsdoc.conf` setting has been deprecated for `previewjsdoc.confFile`
- you are free to use any custom template layout for your jsdoc, the progress will still be displayed
- On MacOS, Chrome can now be used to open the jsdoc when it is defined as default browser (issue [#16])(https://github.com/ludorival/vscode-preview-jsdoc/issues/16)
- Relative path is now supported for the `previewjsodc.output` setting (issue [#17](https://github.com/ludorival/vscode-preview-jsdoc/issues/17))


## 1.0.4
- In case of custom templates, do not override the default template layout file
- Tentative to fix issues [#12](https://github.com/ludorival/vscode-preview-jsdoc/issues/12) [#11](https://github.com/ludorival/vscode-preview-jsdoc/issues/11) [#10](https://github.com/ludorival/vscode-preview-jsdoc/issues/10)
- exclude node_modules from jsdoc configuration
## 1.0.3
- Fix issue [#6](https://github.com/ludorival/vscode-preview-jsdoc/issues/6)

## 1.0.2
 - Fix issues [#4](https://github.com/ludorival/vscode-preview-jsdoc/issues/4)
 
## 1.0.1
 - Fix issues [#1](https://github.com/ludorival/vscode-preview-jsdoc/issues/1) [#2](https://github.com/ludorival/vscode-preview-jsdoc/issues/2)

## [Unreleased]
- Initial release