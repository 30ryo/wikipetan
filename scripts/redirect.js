var redis = require('redis');
var byline = require('byline');
var fs = require ('fs');
var config = require('../config');
var client = redis.createClient(config.redis.port, config.redis.host);
client.select(config.redis.db);

var rs = byline.createLineStream(fs.createReadStream('../data/redirects.txt', { encoding: 'utf8' }));
rs.on('data', function(line) {
  var tmp = line.split(' ');
  client.set("t" + tmp[0], tmp[1]);
});

rs.on('end', function() {
  client.quit();
});
