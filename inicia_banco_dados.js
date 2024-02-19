const { models } = require("./banco/sinc_db");

// Este arquivo serve para inciar a base de dados com informações
// que possuem algum tipo de imutabilidade
// Por exemplo iniciar uma tabela de categorias com os ids necessários
// para executar esse arquivos use node inicia_banco_dados.js

models.grupos_mensagens_status.bulkCreate([
    {
        id: 1,
        nome: "Enviando",
        background_cor: "#BBDEFB",
        fonte_cor: "#1b417a"
    }, {
        id: 2,
        nome: "Enviado",
        background_cor: "#E0F2F1",
        fonte_cor: "#00796B"
    },
    {
        id: 3,
        nome: "Falhou",
        background_cor: "#FFCDD2",
        fonte_cor: "#D32F2F"
    }
]);

models.sinais_mercados.bulkCreate([
    {
        id: 1,
        nome: "Futuros"
    }, {
        id: 2,
        nome: "Spot"
    }
]);

models.sinais_sides.bulkCreate([
    {
        id: 1,
        nome: "Long",
        codigo: "long"
    }, {
        id: 2,
        nome: "Short",
        codigo: "short"
    }
]);

models.sinais_status.bulkCreate([
    {
        id: 1,
        nome: "Aguardando região de entrada",
        codigo: "agnd_reg_entr"
    }, {
        id: 2,
        nome: "Em operação",
        codigo: "em_oper"
    }, {
        id: 3,
        nome: "Stop",
        codigo: "stop"
    }, {
        id: 4,
        nome: "Alvo 1",
        codigo: "alvo1"
    }, {
        id: 5,
        nome: "Alvo 2",
        codigo: "alvo2"
    }, {
        id: 6,
        nome: "Alvo 3",
        codigo: "alvo3"
    }, {
        id: 7,
        nome: "Invalidado",
        codigo: "inval"
    }
]);

models.sinais_tipos_trades.bulkCreate([
    {
        id: 1,
        nome: "Day Trading"
    }, {
        id: 2,
        nome: "Swing Trading"
    }, {
        id: 3,
        nome: "Scalping"
    }
]);

models.midias_sociais.bulkCreate([
    {
        id: 1,
        nome: "WhatsApp",
        codigo: "wpp",
        logo: "https://dicascripto.com/uploads/logos/whatsapp_logo.png",
        background_cor: "#94E49F",
        fonte_cor: "#0B5E16"
    }, {
        id: 2,
        nome: "Telegram",
        codigo: "tgram",
        logo: "https://dicascripto.com/uploads/logos/telegram_logo.png",
        background_cor: "#9adffb",
        fonte_cor: "#066481"
    }, {
        id: 3,
        nome: "Discord",
        codigo: "disc",
        logo: "https://dicascripto.com/uploads/logos/discord_logo.png",
        background_cor: "#d6d6f9",
        fonte_cor: "#4f4dff"
    }
]);