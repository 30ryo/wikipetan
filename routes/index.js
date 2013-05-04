exports.index = function(req, res) {
  var from = req.query.from || '';
  var to = req.query.to || '';
  res.render('index', { title: 'wikipedia最短', from: from, to: to });
};
