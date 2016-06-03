var express = require('express');
var router = express.Router();

var multer  = require('multer');
var upload = multer({ dest: './uploads/' });

var quizController = require('../controllers/quiz_controller');
var commentController = require('../controllers/comment_controller');
var userController = require('../controllers/user_controller');
var sessionController = require('../controllers/session_controller');
var favouriteController = require('../controllers/favourite_controller');
var statisticsController = require('../controllers/statistics_controller');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* GET autor */
router.get('/author', function(req, res, next) {
  res.render('author');
});

// Autoload de parámetros
router.param('quizId', quizController.load);  		// autoload :quizId
router.param('userId', userController.load);  		// autoload :userId
router.param('commentId', commentController.load);  // autoload :commentId


// Definición de rutas de sesión
router.get('/session',    sessionController.new);     // formulario login
router.post('/session',   sessionController.create);  // crear sesión
router.delete('/session', sessionController.destroy); // destruir sesión

// Definición de rutas de cuenta
router.get('/users',                    userController.index);   // listado usuarios
router.get('/users/:userId(\\d+)',      userController.show);    // ver un usuario
router.get('/users/new',                userController.new);     // formulario sign in
router.post('/users',                   userController.create);  // registrar usuario
router.get('/users/:userId(\\d+)/edit', sessionController.loginRequired, 
										sessionController.adminOrMyselfRequired, 
										userController.edit);    // editar información de cuenta
router.put('/users/:userId(\\d+)',      sessionController.loginRequired, 
										sessionController.adminOrMyselfRequired, 
										userController.update);  // actualizar información de cuenta
router.delete('/users/:userId(\\d+)',   sessionController.loginRequired, 
										sessionController.adminAndNotMyselfRequired, 
										userController.destroy); // borrar cuenta
router.get('/users/:userId(\\d+)/quizzes.:format?', 
										sessionController.loginRequired, 
										sessionController.adminOrMyselfRequired, 
										quizController.index);     // ver las preguntas de un usuario


// Definición de rutas de /quizzes
router.get('/quizzes.:format?',            		quizController.index);
router.get('/quizzes/anonymous.:format?',       quizController.index);
router.get('/quizzes/:quizId(\\d+).:format?',  	quizController.show);
router.get('/quizzes/:quizId(\\d+)/check', 		quizController.check);
router.get('/quizzes/new',                 		sessionController.loginRequired, 
												quizController.new);
router.post('/quizzes',                    		sessionController.loginRequired, 
												upload.single('image'),
												quizController.create); 
router.get('/quizzes/:quizId(\\d+)/edit',  		sessionController.loginRequired, 
												quizController.ownershipRequired, 
												quizController.edit);
router.put('/quizzes/:quizId(\\d+)',       		sessionController.loginRequired, 
												quizController.ownershipRequired, 
												upload.single('image'),
												quizController.update);
router.delete('/quizzes/:quizId(\\d+)',    		sessionController.loginRequired,
												quizController.ownershipRequired,  
												quizController.destroy);

// Definición de rutas de comentarios
router.get('/quizzes/:quizId(\\d+)/comments/new',  sessionController.loginRequired, 
	                                               commentController.new);
router.post('/quizzes/:quizId(\\d+)/comments',     sessionController.loginRequired, 
	                                               commentController.create);
router.put('/quizzes/:quizId(\\d+)/comments/:commentId(\\d+)/accept', 
	                                               sessionController.loginRequired,
	                                               quizController.ownershipRequired,  
	                                               commentController.accept);
router.delete('/quizzes/:quizId(\\d+)/comments/:commentId(\\d+)', 
	                                               sessionController.loginRequired,
	                                               commentController.ownershipRequired,  
	                                               commentController.destroy);

// Definición de rutas de favoritos
router.get('/users/:userId(\\d+)/favourites.:format?', 	
												favouriteController.index);
router.put('/users/:userId(\\d+)/favourites/:quizId(\\d+)', 
												sessionController.loginRequired,
                                                sessionController.adminOrMyselfRequired,
                                                favouriteController.add);
router.delete('/users/:userId(\\d+)/favourites/:quizId(\\d+)', 
												sessionController.loginRequired,
                                                sessionController.adminOrMyselfRequired,
                                                favouriteController.del);

// Definición de rutas de estadísticas
router.get('/statistics.:format?',      commentController.statistics,
                                		quizController.statistics,
										userController.statistics,
										statisticsController.index);


module.exports = router;
