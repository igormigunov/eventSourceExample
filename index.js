var http = require('http');
var fs = require('fs');

http.createServer(function(req, res) {
    if (req.url.match(/download/)) {
        downloadFile(req, res);
    } else if (req.headers.accept && req.headers.accept === 'text/event-stream') {
        if (req.url === '/events') {
            sendSSE(req, res);
        } else {
            res.writeHead(404);
            res.end();
        }
    } else {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(fs.readFileSync(__dirname + '/index.html'));
        res.end();
    }
}).listen(5000);
const getParams =  (querystring) => {
    querystring = querystring.substring(querystring.indexOf('?')+1).split('&');
    var params = {}, pair, d = decodeURIComponent;
    // march and parse
    for (var i = querystring.length - 1; i >= 0; i--) {
        pair = querystring[i].split('=');
        params[d(pair[0])] = d(pair[1] || '');
    }

    return params;
};
const downloadFile = (req, res) => {
    const { fileName } = getParams(req.url);
    res.setHeader('Connection', 'Keep-Alive');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    const stream = fs.createReadStream(`${__dirname}/${fileName}`);
    stream.pipe(res);
};

const bigMagic = (res) => {
    let progress = 0;
    const fileName = `result${(new Date()).toLocaleTimeString()}.csv`;
    const stream = fs.createWriteStream(`${__dirname}/${fileName}`);
    stream.write(`date,id,progress\r\n`);
    const interval = setInterval(function() {
        const id = (new Date()).toLocaleTimeString();
        constructSSE(res, id, ++progress, 'progress');
        stream.write(`${new Date()},${id},${progress}\r\n`);
        if (progress === 100) {
            constructSSE(res, 2, 'Finish', 'finish');
            clearInterval(interval);
            stream.close();
            constructSSE(res, 3, fileName, 'file');
        }
    }, 100);
};

const sendSSE = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    const sDir = `${__dirname}/result.csv`;
    const wStream = fs.createWriteStream(sDir);
    wStream.write('id,progress\r\n');
    constructSSE(res, 0, 'Starting....');
    setTimeout(() => constructSSE(res, 1, 'Preparing....'), 100);

    bigMagic(res);
};

const constructSSE = (res, id, data, event = 'message') => {
    console.log(id, data, event);
    res.write(`id: ${id}\n`);
    res.write(`event: ${event}\n`);
    res.write(`data: {"msg": "${data}"}\n\n`);
};
