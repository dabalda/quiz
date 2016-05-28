var models = require('../models');
var Sequelize = require('sequelize');


// Índice de estadísticas
exports.index = function(req, res, next) {

  if (!req.params.format || req.params.format === "html") {
    res.render('statistics', {statistics: req.statistics});
  }
  else if (req.params.format === "json") {
    res.json(req.statistics);
  }
  else {
    throw new Error('No se admite format=' + req.params.format);
  }
};