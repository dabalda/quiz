
var Bot = require('node-telegram-bot-api');
var token = process.env.TELEGRAM_TOKEN;
var bot;
var quizController = require('./controllers/quiz_controller');

if (process.env.BOT === "true") {
	if(process.env.NODE_ENV === 'production') {
	  bot = new Bot(token);
	  bot.setWebHook('https://dbaldazo-quiz.herokuapp.com/' + bot.token);
	}
	else {
	  bot = new Bot(token, { polling: true });
	}

	console.log("Servidor de bot de Telegram inicializado");

	// Comando hola (prueba)
	bot.onText(/^\/hola$/, function (msg, match) {
	    bot.sendMessage(msg.chat.id, '¡Hola!');

	});

	// Comando preguntas
	bot.onText(/^\/preguntas$/, function (msg, match) {
	    quizController.indexTelegram(msg, match);
	});

	// Comando pregunta
	bot.onText(/^\/pregunta_(\d+)$/, function (msg, match) {
	    quizController.showTelegram(msg, match);
	   
	});
}
module.exports = bot;
