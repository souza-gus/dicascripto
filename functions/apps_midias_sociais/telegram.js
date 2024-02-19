const { Telegraf } = require('telegraf');
const fs = require('fs');
require("dotenv").config();

function formatarTextoParaTelegram(texto) {
    // Substitui [b] e [/b] por **, removendo espaços extras ao redor das palavras em negrito
    return texto.replace(/\[b\]\s*/g, '**').replace(/\s*\[\/b\]/g, '**');
};

const enviar_mensagem_telegram = (destinatario, mensagem, imagem_path) => new Promise((resolve, reject) => {
    const telegram = new Telegraf(process.env.BOT_TGRAM_TOKEN);

    mensagem = formatarTextoParaTelegram(mensagem);

    if (!!imagem_path) {

        if (process.env.FILE_STORAGE_PROVIDER === "FTP") {
            var imagem = imagem_path;
        } else {
            var imagem = { source: fs.readFileSync(imagem_path) };
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