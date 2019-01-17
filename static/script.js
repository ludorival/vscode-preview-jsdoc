(function(){
    var loading = document.createElement('div');
    loading.className = 'preview-jsdoc-background-loading';
    var loadingBox = document.createElement('div');
    loading.appendChild(loadingBox);
    loadingBox.className = 'preview-jsdoc-loading-box';
    loadingBox.innerHTML = '<p>Please wait for jsdoc completion <span>.</span><span>.</span><span>.</span></p>';
    var output = document.createElement('div');
    output.classList.add('preview-jsdoc-output');
    loadingBox.appendChild(output);

    document.addEventListener('DOMContentLoaded', function() {
        document.body.appendChild(loading);
    })
    var socket = io();
    
    
    
    socket.onWillJsDocComputed = function () {
        loading.style.display = "block";
        output.innerHTML = '';
    };
    socket.onDidJsDocComputed = function () {
        window.focus();
        setTimeout(function() {window.location.reload()}, 500);
    };
    var appendOutput = function(kind, message) {
        var span = document.createElement('span');
        span.classList.add('preview-jsdoc-' + kind);
        span.innerText = message+'<br/>';
        output.appendChild(span)
    }
    socket.onDidJsDocLogInfo = function (message) {
        appendOutput('info', message);
    };
    socket.onDidJsDocLogError = function (message) {
        appendOutput('error', message);
    };
    socket.on('reload-jsdoc', function (msg) {
        var regExp = /(\w+):(.*)/g
        var match = regExp.exec(msg.trim());
        var key = match[1];
        var value = match[2];
        if (socket[key]) {
            socket[key](value);
        }
    
    });
    socket.on('disconnect', function () {
        window.close();
    })
})()
