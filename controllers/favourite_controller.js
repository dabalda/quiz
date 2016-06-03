
var models = require('../models');

// GET /users/:userId/favourites
exports.index = function(req, res, next) {
    var options = {};
    options.where = {};

    options.include = [models.Attachment, {model: models.User, as: 'Author', attributes: ['username']}];

    var search = req.query.search || '';

    if (search) {
        search_sql = "%"+search.replace(/ /g, "%")+"%";
        options.where.question = {$like: search_sql};
        options.order = ['question'];
    }

    req.user.getFavourites(options)
        .then(function(favourites) {

            favourites.forEach(function(favourite) {
                favourite.favourite = true;
            });

            var title;
            if (req.session.user && req.session.user.id === req.user.id) {
                title = "Mis preguntas favoritas";
            }
            else {
                title = "Preguntas favoritas de " + req.user.username;
            }

            if (!req.params.format || req.params.format === "html") {
                res.render('quizzes/index.ejs', { quizzes: favourites,
                                                  search: search,
                                                  title: title});
            }
            else if (req.params.format === "json") {
                res.json(favourites);
            }
            else {
                throw new Error('No se admite format=' + req.params.format);
            }
        })
        .catch(function(error) {
            next(error);
        });
};



// PUT /users/:userId/favourites/:quizId
exports.add = function(req, res, next) {

    req.user.addFavourite(req.quiz)
        .then(function() {
            if (req.xhr) {
                res.send(200);
            } else {
                var redir = req.body.redir || '/users/' + req.user.id + '/favourites';
                res.redirect(redir);
            }
        })
        .catch(function(error) {
            next(error);
        });
};


// DELETE /users/:userId/favourites/:quizId
exports.del = function(req, res, next) {

    req.user.removeFavourite(req.quiz)
        .then(function() {
            if (req.xhr) {
                res.send(200);
            } else {
                var redir = req.body.redir || '/users/' + req.user.id + '/favourites';
                res.redirect(redir);
            }
        })
        .catch(function(error) {
            next(error);
        });
};