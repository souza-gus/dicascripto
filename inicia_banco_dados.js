const { models } = require("./banco/sinc_db");

// Este arquivo serve para inciar a base de dados com informações
// que possuem algum tipo de imutabilidade
// Por exemplo iniciar uma tabela de categorias com os ids necessários
// para executar esse arquivos use node inicia_banco_dados.js

models.grupos_mensagens_status.bulkCreate([
    {
        id: 1,
        nome: "Em Andamento"
    }, {
        id: 2,
        nome: "Concluído"
    },
    {
        id: 3,
        nome: "Falhou"
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
        codigo: "wpp"
    }, {
        id: 2,
        nome: "Telegram",
        codigo: "tgram"
    }, {
        id: 3,
        nome: "Discord",
        codigo: "disc"
    }
]);