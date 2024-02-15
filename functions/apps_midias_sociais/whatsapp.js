require("dotenv").config();
const fetch  = require("node-fetch");
const { convertFileToBase64 } = require("../manipula_arquivos");

const enviar_mensagem_whatsapp = (destinatario, mensagem, imagem_path) => new Promise((resolve, reject) => {
    
    if(!!imagem_path) {
        if (process.env.PROTOCOLO_SERVIDOR === "HTTP") {
            const base64 = convertFileToBase64(imagem_path);
            var imagem = `data:image/png;base64,${base64}`;
        } else {
            var imagem = imagem_path;
        };

        var url = `https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/send-image`;
        var body = JSON.stringify({ caption: mensagem, phone: destinatario, image: imagem });

    } else {
        var url = `https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/send-text`;
        var body = JSON.stringify({ message: mensagem, phone: destinatario });
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
    enviar_mensagem_whatsapp
};