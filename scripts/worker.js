var redis = require('redis');
var byline = require('byline');
var config = require('../config');
var client = redis.createClient(config.redis.port, config.redis.host);
var client_volatile = redis.createClient(config.redis_volatile.port, config.redis_volatile.host);
var spawn = require('child_process').spawn;
var main = spawn('../bin/main');
var queue_key = config.jobqueue_key;
var current;

client.select(config.redis.db);
client_volatile.select(config.redis_volatile.db);

function wait_job () {
  client.blpop(queue_key, 0, function(err, data) {
    if(err) {
      console.log(err);
      return;
    }
    var key = current = data[1];
    var tmp = key.split('-');
    main.stdin.write(tmp[0] + "\n");
    main.stdin.write(tmp[1] + "\n");
  });
};
wait_job();

var rs = byline.createLineStream(main.stdout);
rs.on('data', function(data) {
  console.log(current + ':' + data);
  client_volatile.setex(current, config.ttl, data, function(err) {
    client.publish(current, data);
    wait_job();
  });
});

process.on('SIGINT', function () {
  main.kill();
  process.exit();
});
