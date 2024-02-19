const { models, auto } = require("../banco/sinc_db");
const { enviar_mensagem_discord } = require('./apps_midias_sociais/discord');
const { enviar_mensagem_whatsapp } = require('./apps_midias_sociais/whatsapp');
const { enviar_mensagem_telegram } = require('./apps_midias_sociais/telegram');

const midias_sociais_triggers = {
    "wpp": (destinatario, mensagem, imagem_path) => {
        return enviar_mensagem_whatsapp(destinatario, mensagem, imagem_path)
    },
    "tgram": (destinatario, mensagem, imagem_path) => {
        return enviar_mensagem_telegram(destinatario, mensagem, imagem_path);
    },
    "disc": (destinatario, mensagem, imagem_path) => {
        return enviar_mensagem_discord(destinatario, mensagem, imagem_path);
    }
};

const enviar_mensagem_midia_social = (codigo, destinatario, mensagem, id_msg, id_midia_social_grupo, imagem_path) => {
    try {
        midias_sociais_triggers[codigo](destinatario, mensagem, imagem_path)
            .then(async data => {

                await models.midias_sociais_grupos_mensagens.update({
                    id_status_mensagem: 2,
                    updated_at: auto.sequelize.literal('CURRENT_TIME')
                }, {
                    where: {
                        id_mensagem: id_msg,
                        id_midia_social_grupo: id_midia_social_grupo
                    }
                });
            })
            .catch(async error => {
                await models.midias_sociais_grupos_mensagens.update({
                    id_status_mensagem: 3,
                    updated_at: auto.sequelize.literal('CURRENT_TIME')
                }, {
                    where: {
                        id_mensagem: id_msg,
                        id_midia_social_grupo: id_midia_social_grupo
                    }
                });

                console.error("\x1b[91m%s\x1b[0m", `Codigo da midia social: ${codigo}\nErro durante a requisição: ${error.message}`);
            });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
    };
};

module.exports = {
    enviar_mensagem_midia_social
};