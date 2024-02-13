const { enviar_mensagem_discord } = require('./apps_midias_sociais/discord');
const { enviar_mensagem_whatsapp } = require('./apps_midias_sociais/whatsapp');
const { enviar_mensagem_telegram } = require('./apps_midias_sociais/telegram');

const midias_sociais_triggers = {
    "wpp": (destinatario, mensagem) => {
        return enviar_mensagem_whatsapp(destinatario, mensagem)
    },
    "tgram": (destinatario, mensagem) => {
        return enviar_mensagem_telegram(destinatario, mensagem);
    },
    "disc": (destinatario, mensagem) => {
        return enviar_mensagem_discord(destinatario, mensagem);
    }
};

module.exports = {
    midias_sociais_triggers
};