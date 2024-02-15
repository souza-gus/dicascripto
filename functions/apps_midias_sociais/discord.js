const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const fs = require('fs');
const path = require('path');
require("dotenv").config();

const Bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

const enviar_mensagem_discord = (destinatario, mensagem, imagem_path) => new Promise(async (resolve, reject) => {
    try {
        await Bot.login(
            process.env.BOT_DISCORD_LOGIN_TOKEN
        );

        const channel = await Bot.channels.fetch(destinatario);

        const embedMensagem = new EmbedBuilder().setDescription(mensagem);

        if (!!imagem_path) {
            var arquivo = process.env.PROTOCOLO_SERVIDOR === "HTTP" ?
                new AttachmentBuilder(fs.readFileSync(imagem_path), { name: path.basename(imagem_path) }) : null;

            embedMensagem.setImage(process.env.PROTOCOLO_SERVIDOR === "HTTP" ?
                `attachment://${path.basename(imagem_path)}` : imagem_path);

            await channel.send({ embeds: [embedMensagem], files: [arquivo] });
        } else {
            await channel.send({ embeds: [embedMensagem] });
        };

        await Bot.destroy();

        resolve();
    } catch (error) {
        reject(error);
    };
});

module.exports = {
    enviar_mensagem_discord
};
