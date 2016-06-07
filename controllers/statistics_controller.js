var models = require('../models');
var Sequelize = require('sequelize');


// Índice de estadísticas
exports.index = function(req, res, next) {

  var statistics = {
  	no_quizzes: req.no_quizzes,
    no_quizzes_with_comments: req.no_quizzes_with_comments,
    no_quizzes_with_attachment: req.no_quizzes_with_attachment,
    avg_quizzes_per_user: (req.no_quizzes/req.no_users).toFixed(2),
  	no_users: req.no_users,
    no_users_with_comments: req.no_users_with_comments,
    no_users_with_quizzes: req.no_users_with_quizzes,
    no_users_with_avatar: req.no_users_with_avatar,
  	no_comments: req.no_comments,
    no_accepted_comments: req.no_accepted_comments,
    avg_comments_per_quiz: (req.no_comments/req.no_quizzes).toFixed(2),
    avg_comments_per_user: (req.no_comments/req.no_users).toFixed(2)
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