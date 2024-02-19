require("dotenv").config();
const fetch = require("node-fetch");
const { convertFileToBase64 } = require("../manipula_arquivos");

function formatarTextoParaWhatsApp(texto) {
    // Substitui [b] e [/b] por *, removendo espaços extras ao redor das palavras em negrito
    return texto.replace(/\[b\]\s*/g, '*').replace(/\s*\[\/b\]/g, '*');
};

const enviar_mensagem_whatsapp = (destinatario, mensagem, imagem_path) => new Promise((resolve, reject) => {

    mensagem = formatarTextoParaWhatsApp(mensagem);
    var body = JSON.stringify({ message: mensagem, phone: destinatario });
    var url = `https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/`;

    if (!!imagem_path) {

        if (process.env.FILE_STORAGE_PROVIDER === "FTP") {
            var imagem = imagem_path;
        } else {
            const base64 = convertFileToBase64(imagem_path);
            var imagem = `data:image/png;base64,${base64}`;
        };

        url += "send-image";
        body = JSON.stringify({ caption: mensagem, phone: destinatario, image: imagem });

    } else {
        url += "send-text";
    };

    fetch(url, {
        method: "POST",
        headers: {
            "Client-Token": process.env.CLIENT_TOKEN_ZAPI,
            "Content-Type": "application/json"
        },
        body: body
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
            };
            return response.json();
        })
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            reject(error);
        });
});

const pegar_chats_whatsapp = () => new Promise((resolve, reject) => {
    fetch(`https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/chats`, {
        method: "GET",
        headers: {
            "Client-Token": process.env.CLIENT_TOKEN_ZAPI,
            "Content-Type": "application/json"
        },
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
            };
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
    enviar_mensagem_whatsapp,
    pegar_chats_whatsapp
};