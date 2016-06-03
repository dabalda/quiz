var models = require('../models');
var Sequelize = require('sequelize');


// Autoload el comentario asociado a :commentId
exports.load = function(req, res, next, commentId) {
  models.Comment.findById(commentId)
      .then(function(comment) {
          if (comment) {
            req.comment = comment;
            next();
          } else { 
            next(new Error('No existe commentId=' + commentId));
          }
        })
        .catch(function(error) { next(error); });
};

// MW que permite acciones solamente si al usuario logeado es admin o es el autor del comentario o del quiz
exports.ownershipRequired = function(req, res, next){

    var isAdmin         = req.session.user.isAdmin;
    var commentAuthorId = req.comment.AuthorId;
    var quizAuthorId    = req.quiz.AuthorId;
    var loggedUserId    = req.session.user.id;

    if (isAdmin || quizAuthorId === loggedUserId || commentAuthorId === loggedUserId) {
        next();
    } else {
      console.log('Operación prohibida: El usuario logeado no es el autor del comentario ni del quiz, ni un administrador.');
      res.send(403);
    }
};


// GET /comments.:format?
// GET /comments/pending.:format?
// GET /users/:userId/comments.:format?
// GET /users/:userId/comments/pending.:format?
exports.index = function(req, res, next) {

  var title = "Comentarios";
  var options = {};
  options.where = {};

  options.include = [{model: models.User, as: 'Author', attributes: ['username']}, 
                     {model: models.Quiz, include: [{model: models.User, 
                                                     as: 'Author', 
                                                    attributes: ['username']}]}];

  var pending;
  if (req.url.match(/\/comments\/pending/)) {
    pending = true;
    options.where.accepted = false;
  }

  if (req.user) {
    if (req.session.user && req.session.user.id === req.user.id) {
      title = "Comentarios " + (pending ? "pendientes " : "") + "en mis preguntas";      
    }
    else {
      title = "Comentarios " + (pending ? "pendientes " : "") + "en las preguntas de "+req.user.username;
    }
    options.include[1].where = {}
    options.include[1].where['AuthorId'] = req.user.id;
    console.log(options);
  }

  var search = req.query.search || '';

  if (search) {
    search_sql = "%"+search.replace(/ /gi, "%")+"%";
    options.where.text = {$like: search_sql};
    options.order = ['text'];
  }

  models.Comment.findAll(options)
    .then(function(comments) {

      if (!req.params.format || req.params.format === "html") {
          res.render('comments/index.ejs', {comments: comments,
                                            search: search,
                                            title: title});
      }
      else if (req.params.format === "json") {
        res.json(comments);
      }
      else {
        throw new Error('No se admite format=' + req.params.format);
      }
    })
    .catch(function(error) {
      next(error);
    });
};


// GET /quizzes/:quizId/comments/new
exports.new = function(req, res, next) {
  var comment = models.Comment.build({text: ""});

  res.render('comments/new', { comment:  comment,
                               quiz:     req.quiz
  	                         });
};


// POST /quizzes/:quizId/comments
exports.create = function(req, res, next) {
  var authorId = req.session.user && req.session.user.id || 0;
  var comment = models.Comment.build(
      							{ text:      req.body.comment.text,          
        							QuizId:    req.quiz.id,
        							AuthorId:  authorId
      							});

  comment.save()
    .then(function(comment) {
      req.flash('success', 'Comentario creado con éxito.');
      res.redirect('/quizzes/' + req.quiz.id);
    }) 
	  .catch(Sequelize.ValidationError, function(error) {

      req.flash('error', 'Errores en el formulario:');
      for (var i in error.errors) {
          req.flash('error', error.errors[i].value);
      };

      res.render('comments/new', { comment: comment,
      	                           quiz:    req.quiz});
    })
    .catch(function(error) {
      req.flash('error', 'Error al crear un Comentario: '+error.message);
		  next(error);
	  });    
};


// GET /quizzes/:quizId/comments/:commentId/accept
exports.accept = function(req, res, next) {

  req.comment.accepted = true;

  req.comment.save(["accepted"])
    .then(function(comment) {
      req.flash('success', 'Comentario aceptado con éxito.');
      res.redirect('/quizzes/'+req.params.quizId);
    })
    .catch(function(error) {
       req.flash('error', 'Error al aceptar un Comentario: '+error.message);
       next(error);
    });
  };

// DELETE /quizzes/:quizId/comments/:commentId
exports.destroy = function(req, res, next) {

    req.comment.destroy()
      .then( function() {
      req.flash('success', 'Comentario borrado con éxito.');
        res.redirect('/quizzes/'+req.params.quizId);
      })
      .catch(function(error){
      req.flash('error', 'Error al borrar el comentario: '+error.message);
        next(error);
      });
  };

// Estadísticas de comentarios
exports.statistics = function(req, res, next) {
  models.Comment.count()
  .then(function(count) {
      req.no_comments = count;
      next();
  })
  .catch(function(error) { next(error); });
};