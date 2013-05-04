var libxml = require('libxmljs');
var fs = require('fs');
var filename = '../data/jawiki-latest-pages-articles.xml';
var parser = new libxml.SaxPushParser();
var rs = fs.createReadStream(filename, { encoding: 'utf8' });
var page_ws = fs.createWriteStream('../data/pages.txt', { encoding: 'utf8' });
var link_ws = fs.createWriteStream('../data/links.txt',  { encoding: 'utf8' });
var id = '', title = '', text = '', ns = '';
var page_drain = true, link_drain = true;
var stack = [];

rs.on('data', function(chunk) {
  process.stdout.write("\r" + id);
  parser.push(chunk);
});

rs.on('end', function() {
  process.stdout.write("\n");
});

page_ws.on('drain', function() {
  page_drain = true;
  if(page_drain && link_drain) {
    rs.resume();
  }
});

link_ws.on('drain', function() {
  link_drain = true;
  if(page_drain && link_drain) {
    rs.resume();
  }
});

parser.on('startElementNS', function(elem, attrs, prefix, uri, namespaces) {
  stack.push(elem);
});

parser.on('endElementNS', function(elem, prefix, uri) {
  stack.pop()
  if(elem !== 'page') {
    return;
  }

  if(ns !== '0') {
    id = '', title = '', text = '', ns = '';
    return;
  }

  title = title.replace(/\s/g, '_');
  var redirect = text.match(/\#REDIRECT \[\[([^\]\#]+)[^\]]*\]\]/m);
  if(redirect) {
    var str = redirect[1].replace(/\s/g, '_');
    if(!page_ws.write(id + ' ' + title + ' ' + "1 " + str +"\n")) {
      page_drain = false;
      rs.pause();
    }
  } else {
    if(!page_ws.write(id + ' ' + title + ' ' + "0 0\n")) {
      page_drain = false;
      rs.pause();
    }
    var match = text.match(/\[\[([^\]\#\|]+)[^\]]*\]\]/gm);
    if(match) {
      var tmp = '';
      for(var i = 0; i < match.length; i++) {
        var str = match[i];
        str = str.match(/\[\[([^\]\#\|]+)[^\]]*\]\]/m)[1];
        str = str.replace(/\s/g, '_');
        tmp += id + ' ' + str + "\n";
      }
      if(!link_ws.write(tmp)) {
        link_drain = false;
        rs.pause()
      }
    }
  }
  id = '', title = '', text = '', ns = '';
});

parser.on('characters', function(chars) {
  if(!stack[3]) {
    if(stack[2] === 'title') {
      title += chars;
    } else if(stack[2] === 'id') {
      id += chars;
    } else if(stack[2] === 'ns') {
      ns += chars;
    }
  } else if(stack[2] === 'revision' && stack[3] === 'text') {
    text += chars;
  }
});

parser.on('warning', function(warning) {
  console.warn('WARNING: ' + warning);
});

parser.on('error', function(error) {
  console.warn('ERROR: ' + error);
});
