
var Bot = require('node-telegram-bot-api');
var token;
var bot;
var quizController = require('./controllers/quiz_controller');

if(process.env.NODE_ENV === 'production') {
  token = '233169121:AAHGpkr0GiENxJ7AsUgfgxuyvOSjOf8EaRw';
  bot = new Bot(token);
  bot.setWebHook('https://dbaldazo-quiz.herokuapp.com/' + bot.token);
}
else {
  token = '189859026:AAGzUayW32Qhw3-C8OfBky5E8kGb5EOHdG8';
  bot = new Bot(token, { polling: true });
}


console.log("Servidor de bot de Telegram inicializado");



// Comando hola (prueba)
bot.onText(/^\/hola (.+)$/, function (msg, match) {
    var name = match[1];
    bot.sendMessage(msg.chat.id, '¡Hola, ' + name+'!');

});

// Comando preguntas
bot.onText(/^\/preguntas$/, function (msg, match) {
    quizController.indexTelegram(msg, match);
});

// Comando pregunta
bot.onText(/^\/pregunta (\d+)$/, function (msg, match) {
    quizController.showTelegram(msg, match);
   
});

module.exports = bot;
