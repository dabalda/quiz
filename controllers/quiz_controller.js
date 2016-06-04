
var models = require('../models');
var Sequelize = require('sequelize');
var cloudinary = require('cloudinary');
var fs = require('fs');
var bot = require('../bot');
var url = require('url');

// Opciones para imagenes subidas a Cloudinary
var cloudinary_image_options = { crop: 'limit', width: 200, height: 200, radius: 5, 
                                 border: "3px_solid_blue", tags: ['core', 'dbaldazo-quiz'] };


// Autoload el quiz asociado a :quizId
exports.load = function(req, res, next, quizId) {
  models.Quiz.findById(quizId, {attributes: ['id', 'question', 'answer', 'AuthorId'], include: [ 
                                {model: models.Comment, include: [ 
                                      {model: models.User, 
                                       as: 'Author', 
                                       attributes: ['username']}]}, 
                                models.Attachment, 
                                {model: models.User, as: 'Author', attributes: ['username']} ] })
      .then(function(quiz) {
          if (quiz) {
            req.quiz = quiz;
          } else { 
            throw new Error('No existe quizId=' + quizId);
          }
      })
      .then(function() {
        // Para usuarios logeados:
        //   Si el quiz es uno de mis favoritos, creo un atributo llamado
        //   "favourite" con el valor true.
        if (req.session.user) {
          req.quiz.getFans({where: {id: req.session.user.id}})
            .then(function(fans) {
                if (fans.length > 0) {
                  req.quiz.favourite = true;
                } 
                next();    
            })
            .catch(function(error){
              next(error);
            });
        } else {
          next();
        }
      })
      .catch(function(error) { next(error); });
};


// MW que permite acciones solamente si al usuario logeado es admin o es el autor del quiz.
exports.ownershipRequired = function(req, res, next){

    var isAdmin      = req.session.user.isAdmin;
    var quizAuthorId = req.quiz.AuthorId;
    var loggedUserId = req.session.user.id;

    if (isAdmin || quizAuthorId === loggedUserId) {
        next();
    } else {
      console.log('Operación prohibida: El usuario logeado no es el autor del quiz, ni un administrador.');
      res.send(403);
    }
};


// GET /quizzes.:format?
// o /users/:userId/quizzes.:format?
exports.index = function(req, res, next) {

  var title = "Preguntas";
  var options = {};
  options.where = {};

  options.include = [models.Attachment, {model: models.User, as: 'Author', attributes: ['username']}];

  if (req.user) {
    if (req.session.user && req.session.user.id === req.user.id) {
      title = "Mis preguntas";      
    }
    else {
      title = "Preguntas de "+req.user.username;
    }

    options.where.AuthorId = req.user.id;
  }

  else if (req.url.match(/^\/quizzes\/anonymous/)) {
    title = "Preguntas anónimas"
    options.where.AuthorId = 0;
  }

  // Para usuarios logeados: incluir los fans de las preguntas.
  if (req.session.user) {
      options.include.push({ model: models.User, as: 'Fans' });
  }

  var search = req.query.search || '';

  if (search) {
    search_sql = "%"+search.replace(/ /gi, "%")+"%";
    options.where.question = {$like: search_sql};
    options.order = ['question'];
  }

  models.Quiz.findAll(options)
    .then(function(quizzes) {

      // Para usuarios logeados:
      //   Añado a todos los quizzes un atributo booleano llamado "favourite"
      //   que indica si el quiz es uno de mis favoritos o no. 
      if (req.session.user) {

          quizzes.forEach(function(quiz) { // Comprueba si algun fan es el logeado
              quiz.favourite = quiz.Fans.some(function(fan) { 
                  return fan.id == req.session.user.id;
              });
          });
      } 

      if (!req.params.format || req.params.format === "html") {
          res.render('quizzes/index.ejs', { quizzes: quizzes,
                                            search: search,
                                            title: title});
      }
      else if (req.params.format === "json") {
        res.json(quizzes);
      }
      else {
        throw new Error('No se admite format=' + req.params.format);
      }
    })
    .catch(function(error) {
      next(error);
    });
};


// GET /quizzes/:quizId.:format?
exports.show = function(req, res, next) {

  if (!req.params.format || req.params.format === "html") {
    var answer = req.query.answer || '';

    res.render('quizzes/show', {quiz: req.quiz,
                                answer: answer});
  }
  else if (req.params.format === "json") {
    res.json(req.quiz);
  }
  else {
    throw new Error('No se admite format=' + req.params.format);
  }

};


// GET /quizzes/:quizId/check
exports.check = function(req, res, next) {

  var answer = req.query.answer || "";

  var result = answer.toLowerCase() === req.quiz.answer.toLowerCase() ? 'correcta' : 'incorrecta';

  if (req.xhr) {
    // res.send(result);
    res.render('quizzes/result', { quiz:   req.quiz, 
                                   result: result, 
                                   answer: answer,
                                   layout: false});
  } else {
    res.render('quizzes/result', { quiz:   req.quiz, 
                                   result: result, 
                                   answer: answer });
  }
};


// GET /quizzes/new
exports.new = function(req, res, next) {

  // URL al que volver despues de crear un nuevo quiz.  
  var redir = req.query.redir || 
              url.parse(req.headers.referer || "/quizzes").pathname;

  var quiz = models.Quiz.build({question: "", answer: ""});
  res.render('quizzes/new', {quiz:  quiz,
                             redir: redir});
};


// POST /quizzes
exports.create = function(req, res, next) {

    var redir = req.body.redir || '/quizzes'

    var authorId = req.session.user && req.session.user.id || 0;
    var quiz = { question: req.body.question, 
                 answer:   req.body.answer,
                 AuthorId: authorId };

    // Guarda en la tabla Quizzes el nuevo quiz.
    models.Quiz.create(quiz)
    .then(function(quiz) {
        req.flash('success', 'Pregunta y Respuesta guardadas con éxito.');

        if (!req.file) { 
            req.flash('info', 'Es un Quiz sin imagen.');
            return; 
        }    

        // Salvar la imagen en Cloudinary
        return uploadResourceToCloudinary(req)
        .then(function(uploadResult) {
            // Crear nuevo attachment en la BBDD.
            return createAttachment(req, uploadResult, quiz);
        });
    })
    .then(function() {
        res.redirect(redir);
    })
    .catch(Sequelize.ValidationError, function(error) {
        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        };
        res.render('quizzes/new', {quiz:  quiz,
        						   redir: redir});
    })
    .catch(function(error) {
        req.flash('error', 'Error al crear un Quiz: '+error.message);
        next(error);
    }); 
};


// GET /quizzes/:quizId/edit
exports.edit = function(req, res, next) {
    // URL al que volver despues de editar el quiz.  
    var redir = req.query.redir || 
                url.parse(req.headers.referer || "/quizzes").pathname;

    var quiz = req.quiz;  // req.quiz: autoload de instancia de quiz

    res.render('quizzes/edit', {quiz: quiz,
                                redir: redir});
};



// PUT /quizzes/:quizId
exports.update = function(req, res, next) {

  var redir = req.body.redir || '/quizzes'

  req.quiz.question = req.body.question;
  req.quiz.answer   = req.body.answer;

  req.quiz.save({fields: ["question", "answer"]})
    .then(function(quiz) {

        req.flash('success', 'Pregunta y Respuesta editadas con éxito.');

        // Sin imagen: Eliminar attachment e imagen viejos.
        if (!req.file) { 
            req.flash('info', 'El Quiz no tiene imagen.');
            if (quiz.Attachment) {
                cloudinary.api.delete_resources(quiz.Attachment.public_id);
                return quiz.Attachment.destroy();
            }
            return; 
        }  

        // Salvar la imagen nueva en Cloudinary
        return uploadResourceToCloudinary(req)
        .then(function(uploadResult) {
            // Actualizar el attachment en la BBDD.
            return updateAttachment(req, uploadResult, quiz);
        })
        .catch(function(error) {
          throw new Error('Error en Cloudinary o BBDD');
        });
    })            
    .then(function() {
        res.redirect(redir);
    })
    .catch(Sequelize.ValidationError, function(error) {

      req.flash('error', 'Errores en el formulario:');
      for (var i in error.errors) {
          req.flash('error', error.errors[i].value);
      };

      res.render('quizzes/edit', {quiz:  req.quiz,
      							  redir: redir});
    })
    .catch(function(error) {
      req.flash('error', 'Error al editar el Quiz: '+error.message);
      next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = function(req, res, next) {

    // URL al que volver despues de borrar el quiz.  
    var redir = req.query.redir || 
                url.parse(req.headers.referer || "/quizzes").pathname;


    // Borrar la imagen de Cloudinary (Ignoro resultado)
    if (req.quiz.Attachment) {
        cloudinary.api.delete_resources(req.quiz.Attachment.public_id);
    }

    models.Comment.destroy({where: {QuizId: req.quiz.id}})

    req.quiz.destroy()
      .then( function() {
      req.flash('success', 'Quiz borrado con éxito.');
        res.redirect(redir);
      })
      .catch(function(error){
      req.flash('error', 'Error al borrar el Quiz: '+error.message);
        next(error);
      });
};

// /preguntas
exports.indexTelegram = function(msg, match) {

  var options = {};

  models.Quiz.findAll(options)
  .then( function(quizzes) {
    var res = "";
    for (var q in quizzes){
      res += ("/pregunta_"+ quizzes[q].id + "\n" + quizzes[q].question + "\n");
    }
    bot.sendMessage(msg.chat.id, res);
  })
};

// /pregunta_quizId
exports.showTelegram = function(msg, match) {

  var quizId = match[1]

  models.Quiz.findById(quizId, {attributes: ['id', 'question', 'answer', 'AuthorId'], include: [ 
                                  {model: models.Comment, include: [ 
                                        {model: models.User, 
                                         as: 'Author', 
                                         attributes: ['username']}]}, 
                                  models.Attachment, 
                                  {model: models.User, as: 'Author', attributes: ['username']} ] })
        .then(function(quiz) {
            if (quiz) { 
              var res = "";

              res = "Pregunta " + quiz.id + "\n"
              if(quiz.Author){
                res += "Autor:\n"+quiz.Author.username+"\n"
              }

              bot.sendMessage(msg.chat.id, res)

              res = quiz.question+"\n";

              var opts = {
                reply_markup: JSON.stringify(
                  {
                    force_reply: true
                  }
                )
              };

              bot.sendMessage(msg.chat.id, res, opts).then( function (sent){
              bot.onReplyToMessage(sent.chat.id, sent.message_id, function (message) {
                var answer = message.text;
                var result = answer === quiz.answer ? 'correcta' : 'incorrecta';
                  bot.sendMessage(sent.chat.id, 'La respuesta "' + answer + '" es ' + result + ".");
              })
              });
            } else { 
              bot.sendMessage(msg.chat.id, "La pregunta "+quizId+" no existe.");
            }
          });
};

// Estadísticas de preguntas
exports.statistics = function(req, res, next) {
  models.Quiz.count()
  .then(function(count) {
      req.no_quizzes = count;
      next();
  })
  .catch(function(error) { next(error); });
};

// FUNCIONES AUXILIARES

/**
 * Crea una promesa para crear un attachment en la tabla Attachments.
 */
function createAttachment(req, uploadResult, quiz) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    return models.Attachment.create({ public_id: uploadResult.public_id,
                                      url: uploadResult.url,
                                      filename: req.file.originalname,
                                      mime: req.file.mimetype,
                                      QuizId: quiz.id })
    .then(function(attachment) {
        req.flash('success', 'Imagen nueva guardada con éxito.');
    })
    .catch(function(error) { // Ignoro errores de validacion en imagenes
        req.flash('error', 'No se ha podido salvar la nueva imagen: '+error.message);
        cloudinary.api.delete_resources(uploadResult.public_id);
    });
}


/**
 * Crea una promesa para actualizar un attachment en la tabla Attachments.
 */
function updateAttachment(req, uploadResult, quiz) {
    if (!uploadResult) {
        return Promise.resolve();
    }

    // Recordar public_id de la imagen antigua.
    var old_public_id = quiz.Attachment ? quiz.Attachment.public_id : null;

    return quiz.getAttachment()
    .then(function(attachment) {
        if (!attachment) {
            attachment = models.Attachment.build({ QuizId: quiz.id });
        }
        attachment.public_id = uploadResult.public_id;
        attachment.url = uploadResult.url;
        attachment.filename = req.file.originalname;
        attachment.mime = req.file.mimetype;
        return attachment.save();
    })
    .then(function(attachment) {
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


/**
 * Crea una promesa para subir una imagen nueva a Cloudinary. 
 * Tambien borra la imagen original.
 * 
 * Si puede subir la imagen la promesa se satisface y devuelve el public_id y 
 * la url del recurso subido. 
 * Si no puede subir la imagen, la promesa tambien se cumple pero devuelve null.
 *
 * @return Devuelve una Promesa. 
 */
function uploadResourceToCloudinary(req) {
    return new Promise(function(resolve,reject) {
        var path = req.file.path;
        cloudinary.uploader.upload(path, function(result) {
                fs.unlink(path); // borrar la imagen subida a ./uploads
                if (! result.error) {
                    resolve({ public_id: result.public_id, url: result.secure_url });
                } else {
                    req.flash('error', 'No se ha podido salvar la nueva imagen: '+result.error.message);
                    resolve(null);
                }
            },
            cloudinary_image_options
        );
    })
}

        


