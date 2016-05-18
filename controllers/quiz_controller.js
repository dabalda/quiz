
var models = require('../models');
var Sequelize = require('sequelize');

// Autoload el quiz asociado a :quizId
exports.load = function(req, res, next, quizId) {
	models.Quiz.findById(quizId, {attributes: ['id', 'question', 'answer', 'AuthorId'],
								include: [models.Comment]})
  		.then(function(quiz) {
      		if (quiz) {
        		req.quiz = quiz;
        		next();
      		} else { 
      			throw new Error('No existe quizId=' + quizId);
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
      console.log('Operación prohibida: El usuario logeado no es el autor del quiz ni un administrador.');
      res.send(403);
    }
};


// GET /quizzes.:format?
exports.index = function(req, res, next) {

	var search = req.query.search || '';

	if (search !== "") {
		search_sql = "%"+search.replace(/ /g, "%")+"%";

		models.Quiz.findAll({where: ["question like ?", search_sql],
                        order: ['question'],
                        attributes: ['id', 'question', 'answer', 'AuthorId']})
			.then(function(quizzes) {
        if (!req.params.format || req.params.format === "html") {
            res.render('quizzes/index.ejs', { quizzes: quizzes,
                        search: search});
        }
        else if (req.params.format === "json") {
          res.send(JSON.stringify(quizzes));
        }
        else {
          throw new Error('No se admite format=' + req.params.format);
        }

			})
			.catch(function(error) {
				next(error);
			});
	}
	else {
		models.Quiz.findAll({attributes: ['id', 'question', 'answer', 'AuthorId']})
			.then(function(quizzes) {
				if (!req.params.format || req.params.format === "html") {
            res.render('quizzes/index.ejs', { quizzes: quizzes,
                        search: search});
        }
        else if (req.params.format === "json") {
          res.send(JSON.stringify(quizzes));
        }
        else {
          throw new Error('No se admite format=' + req.params.format);
        }
			})
			.catch(function(error) {
				next(error);
			});
	}

};


// GET /quizzes/:id.:format?
exports.show = function(req, res, next) {
  if (!req.params.format || req.params.format === "html") {
  	var answer = req.query.answer || '';

  	res.render('quizzes/show', {quiz: req.quiz,
  								answer: answer});
  }
  else if (req.params.format === "json") {
    res.send(JSON.stringify(req.quiz));
  }
  else {
    throw new Error('No se admite format=' + req.params.format);
  }

};


// GET /quizzes/:id/check
exports.check = function(req, res, next) {

	var answer = req.query.answer || "";

	var result = answer === req.quiz.answer ? 'Correcta' : 'Incorrecta';

	res.render('quizzes/result', { quiz: req.quiz, 
								   result: result, 
								   answer: answer });
};


// GET /quizzes/new
exports.new = function(req, res, next) {
  var quiz = models.Quiz.build({question: "", answer: ""});
  res.render('quizzes/new', {quiz: quiz});
};

// POST /quizzes/create
exports.create = function(req, res, next) {

  var authorId = req.session.user && req.session.user.id || 0;

  var quiz = models.Quiz.build({ question: req.body.quiz.question, 
                                 answer:   req.body.quiz.answer,
                                 AuthorId: authorId } );

  // guarda en DB los campos pregunta y respuesta de quiz
  quiz.save({fields: ["question", "answer", "AuthorId"]})
  	.then(function(quiz) {
  		req.flash('success', 'Quiz creado con éxito.');
    	res.redirect('/quizzes');  // res.redirect: Redirección HTTP a lista de preguntas
    })
    .catch(Sequelize.ValidationError, function(error) {

      req.flash('error', 'Errores en el formulario:');
      for (var i in error.errors) {
          req.flash('error', error.errors[i].value);
      };

      res.render('quizzes/new', {quiz: quiz});
    })
    .catch(function(error) {
    	req.flash('error', 'Error al crear un Quiz: '+error.message);
		next(error);
	});  
};


// GET /quizzes/:id/edit
exports.edit = function(req, res, next) {
  var quiz = req.quiz;  // req.quiz: autoload de instancia de quiz

  res.render('quizzes/edit', {quiz: quiz});
};


// PUT /quizzes/:id
exports.update = function(req, res, next) {

  req.quiz.question = req.body.quiz.question;
  req.quiz.answer   = req.body.quiz.answer;

  req.quiz.save({fields: ["question", "answer"]})
    .then(function(quiz) {
    req.flash('success', 'Quiz editado con éxito.');
      res.redirect('/quizzes'); // Redirección HTTP a lista de preguntas.
    })
    .catch(Sequelize.ValidationError, function(error) {

      req.flash('error', 'Errores en el formulario:');
      for (var i in error.errors) {
          req.flash('error', error.errors[i].value);
      };

      res.render('quizzes/edit', {quiz: req.quiz});
    })
    .catch(function(error) {
    req.flash('error', 'Error al editar el Quiz: '+error.message);
      next(error);
    });
};


// DELETE /quizzes/:id
exports.destroy = function(req, res, next) {
  req.quiz.destroy()
    .then( function() {
    req.flash('success', 'Quiz borrado con éxito.');
      res.redirect('/quizzes');
    })
    .catch(function(error){
    req.flash('error', 'Error al editar el Quiz: '+error.message);
      next(error);
    });
};