var redis = require('redis');
var byline = require('byline');
var fs = require ('fs');
var config = require('../config');
var client = redis.createClient(config.redis.port, config.redis.host);
client.select(config.redis.db);

var rs = byline.createLineStream(fs.createReadStream('../data/titles.txt', { encoding: 'utf8' }));
var lc = 0;
rs.on('data', function(line) {
  client.set("l" + lc, line);
  client.set("t" + line, lc);
  lc += 1;
});

rs.on('end', function() {
  client.quit();
});
