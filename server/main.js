var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    messages = require('./messages-util.js');

//test
http.createServer(function (req, res) {
    var urlParse = url.parse(req.url),
        pathname = urlParse.pathname.toString();

    if(pathname.indexOf('/test/client/') == -1){
        res.statusCode = 404;
        res.end();
    }
    else{
        pathname = pathname.replace('/test/client/', '/');
        if(pathname == '/') pathname =  'test/client/index.html';
        else if(pathname.indexOf('test.js') > -1) pathname =  'test/client/test.js';
        else if(pathname.indexOf('node_modules') > -1) pathname = 'test/client' + pathname;
        else pathname = 'client' + pathname;

        fs.readFile(pathname, function(err, data) {
            if(err != null) res.statusCode = 404;
            else  res.write(data);
            res.end();
        });
    }

}).listen(8081, 'localhost');

//client
http.createServer(function (req, res) {
    var urlParse = url.parse(req.url),  url_parts = urlParse.pathname.split('/'),  parsedPath = [];

    for(let u in url_parts) if(url_parts[u] != '') parsedPath.push(url_parts[u]);
    if(urlParse.query != null) parsedPath = parsedPath.concat(unescape(urlParse.query).replace(/\s+/g, "").split('='));

    switch(req.method){
        case 'GET':
            var mime, page = 'client/' + (parsedPath.length == 0 ? 'index.html' : parsedPath.join('/'));
            if(page.indexOf('.html') > 0) mime = "text/html" ;
            if(page.indexOf('.png') > 0) mime = "image/png" ;
            if(page.indexOf('.css') > 0) mime = "text/css" ;
            if(page.indexOf('.ico') > 0) mime = "image/png" ;
            if(page.indexOf('.js') > 0) mime = "application/javascript" ;

            res.writeHeader(200, {"Content-Type": mime});
            fs.readFile(page, function(err, data) {
                if(err != null) fs.readFile('client/404.html', function(err, data) {
                    res.statusCode = 404;
                    res.write(data);
                    res.end();
                });
                else {
                    res.write(data);
                    res.end();
                }
            });
            break;
        case 'POST': res.statusCode = 405; res.end(); break;
        case 'OPTIONS': res.statusCode = 204; res.end(); break;
    }

}).listen(8080, 'localhost');

//server
http.createServer(function (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');

    var urlParse = url.parse(req.url),
        url_parts = urlParse.pathname.split('/'),
        parsedPath = [],
        postData = '';

    for(let u in url_parts) if(url_parts[u] != '') parsedPath.push(url_parts[u]);
    if(urlParse.query != null) parsedPath = parsedPath.concat(unescape(urlParse.query).replace(/\s+/g, "").split('='));

    function returnStatusCode(code){ res.statusCode = 400; res.end(); }

    switch(req.method){
        case 'GET':
            switch(parsedPath[0]){
                default: fs.readFile('client/404.html', function(err, data) { res.statusCode = 404; res.end(data); }); break;  // page script css request
                case 'messages': // poll counter request
                    if(parsedPath.length < 3) { res.statusCode = 400; res.end(); }
                    else{
                        var count = parseInt(parsedPath[2]);
                        if(isNaN(count) || parsedPath[1] != 'counter') return returnStatusCode(400);
                        else messages.getMessages(count, res);
                    }
                    break;
                case 'stats': messages.getStats(res); break; // stats request
            }
            break;
        case 'POST':
            req.on('data', function (data) { postData += data; });
            req.on('end', function () {
                try{ postData = JSON.parse(postData); }
                catch(err){  return returnStatusCode(405); }
                switch(parsedPath[0]){
                    default: return returnStatusCode(405); break;
                    case 'messages': messages.addMessage(postData, res); break; // new message
                    case 'register': messages.register(postData, res); break;
                }
            });
            break;
        case 'DELETE':
            if(parsedPath.length == 2 && parsedPath[0] == 'messages') messages.deleteMessage(parsedPath[1], res);
            else return returnStatusCode(405);
            break;
        case 'OPTIONS': res.statusCode = 204; res.end(); break;
    }
}).listen(9000, 'localhost');
