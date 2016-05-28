
var models = require('../models');
var Sequelize = require('sequelize');

var url = require('url');

var sessionTimeout = 2 * 60 * 1000 // Tiempo de expiración de sesión de usuario


// Middleware: Se requiere hacer login.
//
// Si el usuario ya hizo login anteriormente entonces existirá 
// el objeto user en req.session, por lo que continúo con los demás 
// middlewares o rutas.
// Si no existe req.session.user, entonces es que aún no he hecho 
// login, por lo que me redireccionan a una pantalla de login. 
// Guardo en redir cuál es mi url para volver automáticamente a 
// esa url despues de hacer login; pero si redir ya existe entonces
// conservo su valor.
// 
exports.loginRequired = function (req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/session?redir=' + (req.param('redir') || req.url));
    }
};


// MW que permite gestionar un usuario solamente si el usuario logeado es:
//   - admin 
//   - o es el usuario a gestionar.
exports.adminOrMyselfRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var userId       = req.user.id;
    var loggedUserId = req.session.user.id;

    if (isAdmin || userId === loggedUserId) {
        next();
    } else {
      console.log('Ruta prohibida: no es el usuario logeado, ni un administrador.');
      res.send(403);    }
};


// MW que permite gestionar un usuario solamente si el usuario logeado es:
//   - admin
//   - y no es el usuario a gestionar.
exports.adminAndNotMyselfRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var userId       = req.user.id;
    var loggedUserId = req.session.user.id;

    if (isAdmin || userId === loggedUserId) {
        next();
    } else {
      console.log('Ruta prohibida: no es el usuario logeado, ni un administrador.');
      res.send(403);    }
};


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
//
// Paso como parámetro el valor de redir (es una url a la que 
// redirigirme después de hacer login) que me han puesto en la 
// query (si no existe uso /).
//
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
              req.session.user = {id:user.id, username:user.username, isAdmin:user.isAdmin, expireTime:expireTime, sessionTimeout: sessionTimeout};

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
      req.session.user.expireTime = Date.now() + sessionTimeout;
      req.session.user.sessionTimeout = sessionTimeout;
    }
    else {
      delete req.session.user;
    }
  }

  next();
};