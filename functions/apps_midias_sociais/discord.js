const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const Bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
    ],
});

const enviar_mensagem_discord = (destinatario, mensagem) => new Promise(async (resolve, reject) => {
    try {
        await Bot.login(
            process.env.BOT_DISCORD_LOGIN_TOKEN
        );

        const channel = await Bot.channels.fetch(destinatario);

        // let embedMensagem = new EmbedBuilder()
        //     .setColor("DarkAqua")
        //     .setDescription("Teste")
        //     .setTitle("TEste22332")
        //     .setAuthor({ name: "Mensageiro Automático" })
        //     .setFooter({ text: "Dicas news" });

        let embedMensagem = new EmbedBuilder()
            .setDescription(mensagem);

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
