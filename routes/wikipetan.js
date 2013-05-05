var redis = require('redis');
var config = require('../config');
var client_v = redis.createClient(config.redis_volatile.port, config.redis_volatile.host);
var client_g = redis.createClient(config.redis.port, config.redis.host);
client_g.select(config.redis.db);
client_v.select(config.redis_volatile.db);
var queue_key = config.jobqueue_key;

module.exports = function(req, res, next) {
  var from = req.query.from;
  var to = req.query.to;
  console.log(typeof from);
  console.log(typeof to);
  if(!from && !to) {
    res.redirect('/');
    return;
  } else if(!from) {
    res.redirect('/?to=' + encodeURIComponent(decodeURIComponent(to)));
    return;
  } else if(!to) {
    res.redirect('/?from=' + encodeURIComponent(decodeURIComponent(from)));
    return;
  }
  var from = decodeURIComponent(from);
  var to = decodeURIComponent(to);
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
        if(data.length > 1) {
          var title = from + 'から' + to + 'までは' + (data.length - 1) + 'リンクで到達できます';
        } else {
          var title = from + 'から' + to + 'には到達出来ませんでした';
          data = [];
        }
        var reverse = to + 'から' + from + 'までの最短経路を探索する';
        from = encodeURIComponent(from);
        to = encodeURIComponent(to);
        var reverse_url = '/route?from=' + to + '&to=' + from;
        var url = 'https://twitter.com/home?status=';
        url += encodeURIComponent(title + ' #wikipetan http://wikipetan.kfka.net/route?from=' + from + '&to=' + to);
        res.render('route', { title: title, res: data, tweeturl: url, from: from, to: to, reverse: reverse, reverse_url: reverse_url });
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
