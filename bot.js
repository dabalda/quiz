
var Bot = require('node-telegram-bot-api');
var token = '233169121:AAHGpkr0GiENxJ7AsUgfgxuyvOSjOf8EaRw';
var bot;
var quizController = require('./controllers/quiz_controller');

if(process.env.NODE_ENV === 'production') {
  bot = new Bot(token);
  bot.setWebHook('https://dbaldazo-quiz.herokuapp.com/' + bot.token);
}
else {
  bot = new Bot(token, { polling: true });
}


console.log("Servidor de bot de Telegram inicializado");



// Comando di_hola (prueba)
bot.onText(/^\/di_hola (.+)$/, function (msg, match) {
  var name = match[1];
  bot.sendMessage(msg.chat.id, '¡Hola, ' + name+'!');
});

// Comando lista_preguntas
bot.onText(/^\/lista_preguntas$/, function (msg, match) {
  quizController.indexTelegram().then( function(quizzes) {
    var res = "";
    for (var q in quizzes){
      res += (quizzes[q].question + "\n");
    }

    bot.sendMessage(msg.chat.id, res);
  })


});

module.exports = bot;
