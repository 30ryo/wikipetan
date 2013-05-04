var redis = require('redis');
var config = require('../config');
var client_v = redis.createClient(config.redis_volatile.port, config.redis_volatile.host);
var client_g = redis.createClient(config.redis.port, config.redis.host);
client_g.select(config.redis.db);
client_v.select(config.redis_volatile.db);
var queue_key = config.jobqueue_key;

module.exports = function(req, res, next) {
  console.log(req.body);
  var from = req.query.from;
  var to = req.query.to;
  client_g.mget(["t" + from, "t" + to], function(err, data) {
    var start = data[0];
    var end = data[1];

    if(!start) {
      var str = from + 'が見つかりませんでした';
      res.render('notfound', { title: str, str: str });
      return;
    }

    if(!end) {
      var str = to + 'が見つかりませんでした';
      res.render('notfound', { title: str, str: str });
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
        var title = from + 'から' + to + 'までは' + (data.length - 1) + 'リンクで到達できます。';
        from = encodeURI(from);
        to = encodeURI(to);
        var url = 'https://twitter.com/home?status=' + encodeURIComponent(title + ' #wikipetan http://wikipetan.kfka.net/route?from=' + from + '&to=' + to);
        res.render('route', { title: title, res: data, tweeturl: url });
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
