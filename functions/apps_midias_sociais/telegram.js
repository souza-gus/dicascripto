const { Telegraf } = require('telegraf');
require("dotenv").config();

const enviar_mensagem_telegram = (destinatario, mensagem) => new Promise((resolve, reject) => {
    const telegram = new Telegraf(process.env.BOT_TGRAM_TOKEN);

    telegram.telegram.sendMessage(destinatario, {
        text: mensagem,
        parse_mode: "Markdown",
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            reject(error);
        });
});

module.exports = {
    enviar_mensagem_telegram
};