const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
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

        let embedMensagem = new EmbedBuilder()
            .setDescription(mensagem)
            .setImage(imagem_path);

        await channel.send({ embeds: [embedMensagem] });

        await Bot.destroy();

        resolve();
    } catch (error) {
        reject(error);
    };
});

module.exports = {
    enviar_mensagem_discord
};
