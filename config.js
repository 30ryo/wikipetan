module.exports = {
  redis_volatile: { port: 6380, hots: 'localhost', db: 0 },
  redis:          { port: 6379, hots: 'localhost', db: 0 },
  ttl: 3600,
  port: 3000,
  jobqueue_key:   'jobqueue'
};
