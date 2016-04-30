
var models = require('../models');


// GET /quizzes
exports.index = function(req, res, next) {

	var search = req.query.search || '';

	if (search !== "") {
		search_sql = "%"+search.replace(/ /g, "%")+"%";

		models.Quiz.findAll({where: ["question like ?", search_sql]})
			.then(function(quizzes) {
				quizzes.sort(function(a, b) {
					return a.question.localeCompare(b.question);
				});
				res.render('quizzes/index.ejs', { quizzes: quizzes,
												  search: search});
			})
			.catch(function(error) {
				next(error);
			});
	}
	else {
		models.Quiz.findAll()
			.then(function(quizzes) {
				res.render('quizzes/index.ejs', { quizzes: quizzes,
												  search: search});
			})
			.catch(function(error) {
				next(error);
			});
	}

};


// GET /quizzes/:id
exports.show = function(req, res, next) {
	models.Quiz.findById(req.params.quizId)
		.then(function(quiz) {
			if (quiz) {
				var answer = req.query.answer || '';

				res.render('quizzes/show', {quiz: quiz,
											answer: answer});
			} else {
		    	throw new Error('No existe ese quiz en la BBDD.');
		    }
		})
		.catch(function(error) {
			next(error);
		});
};


// GET /quizzes/:id/check
exports.check = function(req, res) {
	models.Quiz.findById(req.params.quizId)
		.then(function(quiz) {
			if (quiz) {
				var answer = req.query.answer || "";	

				var result = answer === quiz.answer ? 'Correcta' : 'Incorrecta';
				
				res.render('quizzes/result', { quiz: quiz, 
											   result: result, 
											   answer: answer });
			} else {
				throw new Error('No existe ese quiz en la BBDD.');
			}
		})
		.catch(function(error) {
			next(error);
		});
};