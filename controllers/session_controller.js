
var models = require('../models');
var Sequelize = require('sequelize');

var url = require('url');

var sessionTimeout = 2 * 60 * 1000 // Tiempo de expiración de sesión de usuario

/*
 * Autenticar un usuario: Comprueba si el usuario esta registrado en users
 *
 * Devuelve una Promesa que busca el usuario con el login dado y comprueba su password.
 * Si la autenticación es correcta, la promesa se satisface devuelve un objeto con el User.
 * Si la autenticación falla, la promesa se satisface pero devuelve null.
 */
var authenticate = function(login, password) {
    
    return models.User.findOne({where: {username: login}})
        .then(function(user) {
            if (user && user.verifyPassword(password)) {
                return user;
            } else {
                return null;
            }
        });
}; 


// GET /session   -- Formulario de login
exports.new = function(req, res, next) {
    var redir = req.query.redir || 
                url.parse(req.headers.referer || "/").pathname;

    // No volver al formulario de login ni al de registro.
    if (redir === '/session' || redir === '/users/new') {
        redir = "/";
    }

    res.render('session/new', { redir: redir });
};


// POST /session   -- Crear la sesion si usuario se autentica
exports.create = function(req, res, next) {

    var redir = req.body.redir || '/'
    var login     = req.body.login;
    var password  = req.body.password;

    authenticate(login, password)
        .then(function(user) {
            if (user) {
              // Crear req.session.user y guardar campos id, username y expireTime
              // La sesión se define por la existencia de: req.session.user
              var expireTime = Date.now() + sessionTimeout;
              req.session.user = {id:user.id, username:user.username, expireTime:expireTime};

              res.redirect(redir); // redirección a redir
            } else {
                req.flash('error', 'La autenticación ha fallado. Inténtelo otra vez.');
                res.redirect("/session?redir="+redir);
            }
          
    })
    .catch(function(error) {
            req.flash('error', 'Se ha producido un error: ' + error);
            next(error);        
    });
};


// DELETE /session   -- Destruir sesion 
exports.destroy = function(req, res, next) {

    delete req.session.user;
    
    res.redirect("/session"); // redirect a login
};

// Autologout

exports.autologout = function(req, res, next) {

  if (req.session.user) { // Hay una sesión iniciada

    if (req.session.user.expireTime >= Date.now()) {
      req.session.user.expireTime === Date.now() + sessionTimeout;
    }
    else {
      delete req.session.user;
    }
  }

  next();
};