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

function formatarTextoParaDiscord(texto) {
    // Substitui [b] e [/b] por **, removendo espaços extras ao redor das palavras em negrito
    return texto.replace(/\[b\]\s*/g, '**').replace(/\s*\[\/b\]/g, '**');
};

const enviar_mensagem_discord = (destinatario, mensagem, imagem_path) => new Promise(async (resolve, reject) => {
    try {
        mensagem = formatarTextoParaDiscord(mensagem);

        await Bot.login(
            process.env.BOT_DISCORD_LOGIN_TOKEN
        );

        const channel = await Bot.channels.fetch(destinatario);

        const embedMensagem = new EmbedBuilder().setDescription(mensagem);
        const embedOptions = { embeds: [embedMensagem] };

        if (imagem_path) {

            if (process.env.FILE_STORAGE_PROVIDER === "FTP") {
                embedOptions.embeds[0].setImage(imagem_path);
            } else {
                const arquivo = new AttachmentBuilder(fs.readFileSync(imagem_path), { name: path.basename(imagem_path) });
                embedOptions.embeds[0].setImage(`attachment://${path.basename(imagem_path)}`);
                embedOptions.files = [arquivo];
            };

        };

        await channel.send(embedOptions);
        await Bot.destroy();

        resolve();
    } catch (error) {
        reject(error);
    };
});

module.exports = {
    enviar_mensagem_discord
};
