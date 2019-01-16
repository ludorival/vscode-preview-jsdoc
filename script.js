(function () {

    var loading = document.createElement('div');
    loading.classList.add('preview-jsdoc-background-loading');
    loading.innerHTML = '<div class="preview-jsdoc-loading-box">\n<p>Pleasewait for jsdoc <span>.</span><span>.</span><span>.</span></p>\n </div>'
    document.addEventListener("DOMContentLoaded", function(event) { 
        document.body.appendChild(loading);
    });
    

    var socket = io();
            
    socket.onWillJsDocComputed = function() {

        loading.style.display = "block";
    };
    socket.onDidJsDocComputed = function() {
        window.location.reload();
    };
    socket.on('reload-jsdoc', function (msg) {
        if (socket[msg]) {
            socket[msg]();
        }
        
    });
    socket.on('disconnect', function() {
        window.close();
    })
})();