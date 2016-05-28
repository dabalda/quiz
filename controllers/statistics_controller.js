var models = require('../models');
var Sequelize = require('sequelize');


// Índice de estadísticas
exports.index = function(req, res, next) {
  res.json(req.statistics);
};