const { Telegraf } = require('telegraf');
const fs = require('fs');
require("dotenv").config();

const enviar_mensagem_telegram = (destinatario, mensagem, imagem_path) => new Promise((resolve, reject) => {
    const telegram = new Telegraf(process.env.BOT_TGRAM_TOKEN);

    if (!!imagem_path) {

        if (process.env.PROTOCOLO_SERVIDOR === "HTTP") {
            var imagem = { source: fs.readFileSync(imagem_path) };
        } else {
            var imagem = imagem_path;
        };

        var tgram = telegram.telegram.sendPhoto(destinatario, imagem, {
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