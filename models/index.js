var path = require('path');

// Cargar ORM (Object-Relational Mapping)
var Sequelize = require('sequelize');

// Usar BBDD SQLite:
//    DATABASE_URL = sqlite:///
//    DATABASE_STORAGE = quiz.sqlite

// Usar BBDD Postgres:
//    DATABASE_URL = postgres://user:passwd@host:port/database

var url, storage;

if (!process.env.DATABASE_URL) {
    url = "sqlite:///";
    storage = "quiz.sqlite";
} else {
    url = process.env.DATABASE_URL;
    storage = process.env.DATABASE_STORAGE || "";
}

var sequelize = new Sequelize(url, 
	 						  { storage: storage,
				              	omitNull: true 
				              });


// Importar la definición de la tabla Quiz de quiz.js
var Quiz = sequelize.import(path.join(__dirname,'quiz'));

// Importar la definición de la tabla Comments de comment.js
var Comment = sequelize.import(path.join(__dirname,'comment'));

// Importar la definición de la tabla Users de user.js
var User = sequelize.import(path.join(__dirname,'user'));

// Importar la definición de la tabla Attachments de attachment.js
var Attachment = sequelize.import(path.join(__dirname,'attachment'));

// Importar la definición de la tabla Avatars de avatar.js
var Avatar = sequelize.import(path.join(__dirname,'avatar'));

// Favoritos:
//   Un Usuario tiene muchos quizzes favoritos.
//   Un quiz tiene muchos fans (los usuarios que lo han marcado como favorito)
User.belongsToMany(Quiz, {as: 'Favourites', 
                          through: 'Favourites'});
Quiz.belongsToMany(User, {as: 'Fans',
                          through: 'Favourites'}); 

// Relaciones entre modelos
// Relación 1 a N entre Quiz y Comment:
Comment.belongsTo(Quiz);
Quiz.hasMany(Comment);

// Relación 1 a N entre User y Comment:
User.hasMany(Comment, {foreignKey: 'AuthorId'});
Comment.belongsTo(User, {as: 'Author', foreignKey: 'AuthorId'}); // Añade Author a comment en lugar de AuthorId

// Relación 1 a N entre User y Quiz:
User.hasMany(Quiz, {foreignKey: 'AuthorId'});
Quiz.belongsTo(User, {as: 'Author', foreignKey: 'AuthorId'}); // Añade Author a quiz en lugar de AuthorId

// Relación 1 a 1 ente Quiz y Attachment
Attachment.belongsTo(Quiz);
Quiz.hasOne(Attachment);

// Relación 1 a 1 ente User y Avatar
Avatar.belongsTo(User);
User.hasOne(Avatar);

exports.Quiz = Quiz;       			// exportar definición de tabla Quiz
exports.Comment = Comment; 			// exportar definición de tabla Comments
exports.User = User;       			// exportar definición de tabla Users
exports.Attachment = Attachment; 	// exportar definición de tabla Attachments
exports.Avatar = Avatar; 			// exportar definición de tabla Avatars