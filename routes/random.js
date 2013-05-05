var redis = require('redis');
var config = require('../config');
var client = redis.createClient(config.redis_volatile.port, config.redis_volatile.host);
var client_g = redis.createClient(config.redis.port, config.redis.host);
client.select(config.redis.db);

module.exports = function(req, res, next) {
  (function get_random(n) {
    if(n > 10) {
      res.redirect('/');
    }
    client.randomkey(function(err, key) {
      client.get(key, function(err, data) {
        if(data == 'inprogress') {
          get_random(n+1);
        } else {
          var keys = key.split('-').map(function(e) { return 'l' + e; });
          client_g.mget(keys, function(err, data) {
            var from = encodeURIComponent(data[0]);
            var to = encodeURIComponent(data[1]);
            res.redirect('/route?from=' + from + '&to=' + to);
            client.expire(key, config.ttl);
          });
        }
      });
    });
  })(0);
};
