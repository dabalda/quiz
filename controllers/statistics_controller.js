var models = require('../models');
var Sequelize = require('sequelize');


// Índice de estadísticas
exports.index = function(req, res, next) {

  var statistics = {
  	no_quizzes: req.no_quizzes,
  	no_users: req.no_users,
  	no_comments: req.no_comments
  }


  if (!req.params.format || req.params.format === "html") {
    res.render('statistics', {statistics: statistics});
  }
  else if (req.params.format === "json") {
    res.json(statistics);
  }
  else {
    throw new Error('No se admite format=' + req.params.format);
  }
};