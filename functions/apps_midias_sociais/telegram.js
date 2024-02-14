const { Telegraf } = require('telegraf');
require("dotenv").config();

const enviar_mensagem_telegram = (destinatario, mensagem, imagem_path) => new Promise((resolve, reject) => {
    const telegram = new Telegraf(process.env.BOT_TGRAM_TOKEN);

    if (!!imagem_path) {
        var tgram = telegram.telegram.sendPhoto(destinatario, imagem_path, {
            caption: mensagem,
            parse_mode: "Markdown",
        });
    } else {
        var tgram = telegram.telegram.sendMessage(destinatario, {
            text: mensagem,
            parse_mode: "Markdown",
        });
    };

    tgram.then(data => {
        resolve(data);
    })
        .catch(error => {
            reject(error);
        });
});

module.exports = {
    enviar_mensagem_telegram
};