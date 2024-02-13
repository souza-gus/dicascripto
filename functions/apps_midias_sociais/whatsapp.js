require("dotenv").config();

const enviar_mensagem_whatsapp = (destinatario, mensagem) => new Promise((resolve, reject) => {
    fetch(`https://api.z-api.io/instances/${process.env.ID_INSTANCIA_ZAPI}/token/${process.env.TOKEN_INSTANCIA}/send-text`, {
        method: "POST",
        headers: {
            "Client-Token": process.env.CLIENT_TOKEN_ZAPI,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: mensagem, phone: destinatario })
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