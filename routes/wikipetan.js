var redis = require('redis');
var config = require('../config');
var client_v = redis.createClient(config.redis_volatile.port, config.redis_volatile.host);
var client_g = redis.createClient(config.redis.port, config.redis.host);
client_g.select(config.redis.db);
client_v.select(config.redis_volatile.db);
var queue_key = config.jobqueue_key;

module.exports = function(req, res, next) {
  client_g.mget(["t" + req.params.start, "t" + req.params.end], function(err, data) {
    var start = data[0];
    var end = data[1];

    if(!start) {
      res.send(req.params.start + 'が見つかりませんでした');
      return;
    }

    if(!end) {
      res.send(req.params.end + 'が見つかりませんでした');
      return;
    }
    var key = start + '-' + end;
    var client_s = redis.createClient(config.redis.port, config.redis.host);
    client_s.select(config.redis.db);
    var sended = false;

    var send_result = function(channel, result) {
      if(sended) { return; }
      sended = true;
      client_s.unsubscribe();
      client_s.quit();

      var mget = result.split(',').reverse().map(function(e) { return 'l' + e; });
      client_g.mget(mget, function(err, data) {
        res.send(data);
      });
    }

    client_s.on('message', send_result);

    client_s.on('ready', function() {
      client_s.subscribe(key);
      client_v.setnx(key, 'inprogress', function(err, data) {
        if(err) {
          console.log(err);
          return;
        }
        if(data === 0) {
          client_v.get(key, function(err, data) {
            if(err) {
              console.log(err)
              return;
            }
            if(data !== 'inprogress') {
              client_v.expire(key, config.ttl);
              send_result(null, data);
            }
          });
        } else {
          client_g.rpush(queue_key, key);
        }
      });
    });
  });
};
