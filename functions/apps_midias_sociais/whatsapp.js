require("dotenv").config();
const fetch = require("node-fetch");
const { convertFileToBase64 } = require("../manipula_arquivos");

function formatarTextoParaWhatsApp(texto) {
    // Substitui [b] e [/b] por *, removendo espaços extras ao redor das palavras em negrito
    return texto.replace(/\[b\]\s*/g, '*').replace(/\s*\[\/b\]/g, '*');
};

const enviar_mensagem_whatsapp = (destinatario, mensagem, imagem_path, tipo_mensagem = "Comum", linkUrl, title, linkDescription, documento_base64, fileName, caption) => new Promise((resolve, reject) => {

    mensagem = formatarTextoParaWhatsApp(mensagem);
    var body = JSON.stringify({ message: mensagem, phone: destinatario });
    var url = `https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/`;
    var imagem = null;

    // Atualiza a variavel da imagem
    if (imagem_path) {
        if (process.env.FILE_STORAGE_PROVIDER === "FTP") {
            imagem = imagem_path;
        } else {
            const base64 = convertFileToBase64(imagem_path);
            imagem = `data:image/png;base64,${base64}`;
        };
    };

    // Envio de mensagem comum para o WatsApp com textos simples
    if (tipo_mensagem === "Comum") {
        if (imagem_path) {
            url += "send-image";
            body = JSON.stringify({ caption: mensagem, phone: destinatario, image: imagem });

        } else {
            url += "send-text";
        };
    };

    // Envio de mensagem com link. Obs: é aquele tipo de measnegm do whats que
    // aparece uma imagem e o link da url no header to texto.
    if (tipo_mensagem === "Link") {
        url += "send-link";
        body = JSON.stringify({ 
            phone: destinatario, 
            message: mensagem, 
            image: imagem ,
            linkUrl,
            title,
            linkDescription
        });
    };

    // Envio de documento
    if (tipo_mensagem === "Documento") {
        url += "send-document/pdf";
        
        body = JSON.stringify({ 
            phone: destinatario,
            document: `data:application/pdf;base64,${documento_base64}`, 
            fileName,
            caption
        });
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
        .then(chats => {
            Promise.all(chats.map(async chat => {
                if (chat.isGroup) {
                    const picture = await fetch(`https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/profile-picture?phone=${chat.phone}`, {
                        method: "GET",
                        headers: {
                            "Client-Token": process.env.CLIENT_TOKEN_ZAPI,
                            "Content-Type": "application/json"
                        },
                    }).then(resp => resp.json()).catch(error => null);

                    return {
                        name: chat.name,
                        phone: chat["phone"],
                        ...picture
                    };
                };
            })).then(new_chats => {
                resolve(new_chats.filter(new_chat => new_chat != undefined));
            });
        })
        .catch(error => {
            reject(error);
        });
});

module.exports = {
    enviar_mensagem_whatsapp,
    pegar_chats_whatsapp
};