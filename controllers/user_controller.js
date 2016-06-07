
var models = require('../models');
var Sequelize = require('sequelize');
var cloudinary = require('cloudinary');
var cloudinaryController = require('./cloudinary_controller');

// Opciones para imagenes subidas a Cloudinary
var cloudinary_image_options = { crop: 'fill', width: 90, height: 90, radius: 45, gravity: 'face', tags: ['core', 'dbaldazo-quiz'] };


// Autoload el user asociado a :userId
exports.load = function(req, res, next, userId) {
    models.User.findById(userId, {include: [models.Avatar]})
        .then(function(user) {
            if (user) {
                req.user = user;
                next();
            } else {
                req.flash('error', 'No existe el usuario con id='+id+'.');
                throw new Error('No existe userId=' + userId);
            }
        })
        .catch(function(error) { next(error); });
};


// GET /users
exports.index = function(req, res, next) {
    models.User.findAll({order: ['username'], include: [models.Avatar]})
        .then(function(users) {
            res.render('users/index', { users: users });
        })
        .catch(function(error) { next(error); });
};


// GET /users/:id
exports.show = function(req, res, next) {
    res.render('users/show', {user: req.user});
};


// GET /users/new
exports.new = function(req, res, next) {
    var user = models.User.build({ username: "", 
                                   password: "" });

    res.render('users/new', { user: user });
};


// POST /users
exports.create = function(req, res, next) {

    var options = {fields: ["username", "password", "salt"]};

    var user = models.User.build({ username: req.body.user.username,
                                   password: req.body.user.password
                                });

    if (req.session.user && req.session.user.isAdmin) {
        user.isAdmin = req.body.user.isAdmin;
        options.fields.push("isAdmin");
    }

    // El login debe ser unico:
    models.User.find({where: {username: req.body.user.username}})
        .then(function(existing_user) {
            if (existing_user) {
                var emsg = "El usuario \""+ req.body.user.username +"\" ya existe."
                req.flash('error', emsg);
                res.render('users/new', { user: user });
            } else {
                // Guardar en la BBDD
                return user.save(options)
                    .then(function(user) { 

                        req.flash('success', 'Usuario creado con éxito.');

                        if (!req.file) { 
                            req.flash('info', 'Es un usuario sin imagen de perfil.');
                            return; 
                        }  
                        // Salvar la imagen en Cloudinary
                        return cloudinaryController.uploadResourceToCloudinary(req, cloudinary_image_options)
                        .then(function(uploadResult) {
                            // Crear nuevo avatar en la BBDD.
                            return createAvatar(req, uploadResult, user);
                        });
                    })
                    .then(function() { 
                        res.redirect('/session'); // Redirección a página de login                        
                    })
                    .catch(Sequelize.ValidationError, function(error) {
                        req.flash('error', 'Errores en el formulario:');
                        for (var i in error.errors) {
                            req.flash('error', error.errors[i].value);
                        };
                        res.render('users/new', { user: user });
                    });
            }
        })
        .catch(function(error) { 
            next(error);
        });
};


// GET /users/:id/edit
exports.edit = function(req, res, next) {
    res.render('users/edit', { user: req.user });  // req.user: instancia de user cargada con autoload
};            


// PUT /users/:id
exports.update = function(req, res, next) {

    var options = {fields: []};

    if (req.session.user.isAdmin && req.user.id !== req.session.user.id) { // Si se pueden modificar los permisos
        
        options.fields.push("isAdmin");
        console.log("Puede modificar permisos.");

        if (! req.body.user.password) { // Si el campo de contraseña está vacío
            console.log("Contraseña vacía.");
            if (req.user.isAdmin === !!req.body.user.isAdmin) { // Si no se modifican los permisos
                console.log("No quiere modificar permisos.");
                if (!req.file && !req.body.removeAvatar) {
                    console.log("No quiere modificar avatar.");
                    req.flash('error', "No hay nada nuevo que guardar."); // Se pide que se haga algún cambio
                    return res.render('users/edit', {user: req.user});
                } else {
                    console.log("Quiere modificar avatar.");
                }
            } else {
                console.log("Quiere modificar permisos.");
            }
        } else { // Si el campo de contraseña no está vacío se intenta guardar contraseña y permisos
            console.log("Contraseña rellena.");
            req.user.password  = req.body.user.password;
            options.fields.push("password", "salt");
        }
        req.user.isAdmin = !!req.body.user.isAdmin;

    } else { // Si no se pueden modificar los permisos
        console.log("No puede modificar permisos.");
        if (! req.body.user.password) { // Si el campo de contraseña está vacío
            console.log("Contraseña vacía.");
            if (!req.file && !req.body.removeAvatar) {
                console.log("No quiere modificar avatar.");
                req.flash('error', "No hay nada nuevo que guardar."); // Se pide que se haga algún cambio
                return res.render('users/edit', {user: req.user});                 
            }

        } else { // Si el campo de contraseña no está vacío se intenta guardar
            console.log("Contraseña rellena.");
            req.user.password  = req.body.user.password;
            options.fields.push("password", "salt");
        }
    }

    req.user.save(options)
        .then(function(user) {
            req.flash('success', 'Usuario actualizado con éxito.');

            // Se ha marcado borrar y no hay imagen nueva: Eliminar avatar e imagen viejos.
            if (!req.file && !!req.body.removeAvatar) {                 
                if (user.Avatar) {
                    req.flash('success', 'El usuario ya no tiene imagen de perfil.');
                    cloudinary.api.delete_resources(user.Avatar.public_id);
                    return user.Avatar.destroy();
                }
                req.flash('info', 'El usuario no tenía imagen de perfil.');
                return; 
            } 

            else if (req.file) {
                // Salvar la imagen nueva en Cloudinary
                return cloudinaryController.uploadResourceToCloudinary(req, cloudinary_image_options)
                .then(function(uploadResult) {
                    // Actualizar el avatar en la BBDD.
                    return updateAvatar(req, uploadResult, user);
                })
                .catch(function(error) {
                  throw new Error('Error en Cloudinary o BBDD');
                });
            }
        })
        .then(function() {
            res.redirect('/users/'+req.user.id);
        })
        .catch(Sequelize.ValidationError, function(error) {

            req.flash('error', 'Errores en el formulario:');
            for (var i in error.errors) {
                req.flash('error', error.errors[i].value);
            };

            res.render('users/edit', {user: req.user});
        })
        .catch(function(error) {
            next(error);
        });
};


// DELETE /users/:id
exports.destroy = function(req, res, next) {

    // Borrar la imagen de Cloudinary (Ignoro resultado)
    if (req.user.Avatar) {
        cloudinary.api.delete_resources(req.user.Avatar.public_id);
    }

    req.user.destroy()
        .then(function() {
            // Cuando el usuario a borrar es el logeado
            if (req.session.user && req.session.user.id === req.user.id) {
                // borra la sesión y redirige a /
                delete req.session.user;
            }
            req.flash('success', 'Usuario eliminado con éxito.');
            res.redirect('/');
        })
        .catch(function(error){ 
            next(error); 
        });
};

// Estadísticas de usuarios
exports.statistics = function(req, res, next) {

    var p1 = models.User.count();

    var options2 = {
        distinct: true,
        include: [{ model: models.Comment,
                    required: true}]
    };
    var p2 = models.User.count(options2);

    var options3 = {
        distinct: true,
        include: [{ model: models.Quiz,
                    required: true}]
    };
    var p3 = models.User.count(options3);

    var options4 = {
        distinct: true,
        include: [{ model: models.Avatar,
                    required: true}]
    };
    var p4 = models.User.count(options4);

    Promise.all([p1, p2, p3, p4])
    .then(function(count){
      req.no_users = count[0];
      req.no_users_with_comments = count[1];
      req.no_users_with_quizzes = count[2];
      req.no_users_with_avatar = count[3];
      next();
    })
    .catch(function(error) { next(error); });
};


// FUNCIONES AUXILIARES

/**
 * Crea una promesa para crear un avatar en la tabla Avatars.
 */
function createAvatar(req, uploadResult, user) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    return models.Avatar.create({     public_id: uploadResult.public_id,
                                      url: uploadResult.url,
                                      filename: req.file.originalname,
                                      mime: req.file.mimetype,
                                      UserId: user.id })
    .then(function(avatar) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}


/**
 * Crea una promesa para actualizar un avatar en la tabla Avatars.
 */
function updateAvatar(req, uploadResult, user) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    // Recordar public_id de la imagen antigua.
    var old_public_id = user.Avatar ? user.Avatar.public_id : null;

    return user.getAvatar()
    .then(function(avatar) {
        if (!avatar) {
            avatar = models.Avatar.build({ UserId: user.id });
        }
        avatar.public_id = uploadResult.public_id;
        avatar.url = uploadResult.url;
        avatar.filename = req.file.originalname;
        avatar.mime = req.file.mimetype;
        return avatar.save();
    })
    .then(function(avatar) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
        if (old_public_id) {
            cloudinary.api.delete_resources(old_public_id);
        }
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}