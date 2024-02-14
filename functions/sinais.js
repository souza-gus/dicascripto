const { models, auto } = require("../banco/sinc_db");
const { Op } = require('sequelize');
const { ws_sinais_cache } = require("./sinais_cache");
const { WebsocketStream } = require("@binance/connector");

// Mepeia  de acordo com o status do sinal
const verifica_status_sinal = {
    "stop": (side, preco_stop, ws_preco_cripto) => (side === 1 && ws_preco_cripto <= preco_stop) || (side === 2 && ws_preco_cripto >= preco_stop),
    "entrada": (side, ei, ef, ws_preco_cripto) => (side === 1 && ws_preco_cripto >= ei && ws_preco_cripto <= ef) || (side === 1 && ws_preco_cripto <= ei && ws_preco_cripto >= ef),
    "alvos": (side, preco_alvo, ws_preco_cripto) => (side === 1 && ws_preco_cripto >= preco_alvo) || (side === 2 && ws_preco_cripto <= preco_alvo)
};

// Mepeia os preços analisados de acordo com o status do sinal
const precos_analisados_sinal = {
    2: (sinal) => sinal.alvo1,
    4: (sinal) => sinal.alvo2,
    5: (sinal) => sinal.alvo3,
};

// Mepeia as mesnagens de alvo de acordo com o status do sinal
const mensagens_alvos_sinal = {
    1: "Região de entrada atingida",
    2: "Alvo 1 atingido",
    4: "Alvo 2 atingido",
    5: "Alvo 3 atingido",
};

// Mepeia os próximos status quando um sinal atinge certas posições
const proximos_status_sinal = {
    1: 2,
    2: 4,
    4: 5,
    5: 6,
};

const analisar_sinal = (sinal, ws_preco_cripto) => {

    if (verifica_status_sinal["stop"](sinal.id_side_sinal, sinal.stop, ws_preco_cripto)) {
        console.log("Stopou");
    };

    if (sinal.id_status_sinal === 1) {

        if (verifica_status_sinal["entrada"](sinal.id_side_sinal, sinal.entrada_inicial, sinal.entrada_final, ws_preco_cripto)) {

            console.log(mensagens_alvos_sinal[sinal.id_status_sinal]);

            models.sinais.update({ id_status_sinal: proximos_status_sinal, updated_at: auto.sequelize.literal('CURRENT_TIME') }, {
                where: { id: sinal.id }
            });
        };

    } else {
        const preco_alvo = precos_analisados_sinal[sinal.id_status_sinal];

        if (verifica_status_sinal["alvos"](sinal.id_side_sinal, preco_alvo, ws_preco_cripto)) {
            console.log(mensagens_alvos_sinal[sinal.id_status_sinal]);
        };
    };

};

const conectar_websocket = {

    /**
     * 
     * @param {
     *  exchange: "binance",
     *  cripto1: "btc",
     *  cripto2: "usdt",
     *  sinais: [ ...objeto da tabela sinais ]
     * } ws_sinal_cache
     */
    binance: (ws_sinal_cache) => {
        const websocket_binance = new WebsocketStream({
            callbacks: {
                open: () => console.log("Conectado ao servidor Websocket da Binance"),
                close: () => console.log("Desconectado do servidor Websocket da Binance"),
                message: (wsdata) => {
                    const data = JSON.parse(wsdata);
                    console.log(data.c)

                    ws_sinal_cache.sinais.forEach(sinal => {
                        analisar_sinal(sinal, 45010);
                    });
                },
            },
            wsURL: "wss://fstream.binance.com"
        });

        websocket_binance.ticker(`${ws_sinal_cache.cripto1.toLowerCase()}${ws_sinal_cache.cripto2.toLowerCase()}`);
    }
};

const inicializa_monitoramento_sinais = async () => {
    try {

        /**
         * Função para inicializar monitoramento de sinais e adiocionar ao cache
         * IDS dos status dos sinais
         * 1 - Aguardando região de entrada
         * 2 - Em operação
         * 3 - Stop
         * 4 - Alvo 1
         * 5 - Alvo 2
         * 6 - Alvo 3
         * 7 - Invalidado
        */

        // Busca sinais no banco ativos e que possuem status validos para serem monitorados
        const sinais = await models.sinais.findAll({
            where: {
                id_status_sinal: { [Op.notIn]: [3, 6, 7] },
                ativo: true
            },
            include: [
                { model: models.criptomoedas, as: "id_cripto1_sinal_criptomoeda", attributes: ["sigla"] },
                { model: models.criptomoedas, as: "id_cripto2_sinal_criptomoeda", attributes: ["sigla"] },
                { model: models.exchanges, as: "id_exchange_sinal_exchange", attributes: ["nome"] }
            ],
            raw: true
        });

        if (sinais.length === 0) {
            return;
        };

        // Percorre cada sinal para montar o cache dos sinais e abrir as conexõe com o WS
        sinais.forEach(sinal => {

            const exchange = sinal["id_exchange_sinal_exchange.nome"].toLowerCase();
            const cripto1 = sinal["id_cripto1_sinal_criptomoeda.sigla"].toLowerCase();
            const cripto2 = sinal["id_cripto2_sinal_criptomoeda.sigla"].toLowerCase();

            // Monta a key que sera inserida no cache
            const key = `${exchange}_${cripto1}${cripto2}`;

            // Verifica se ja existe a key no cache e adiciona o sinal a lista de sinais do cache existente
            // Se o cache não existe criar o novo objeto no cache
            if (!!ws_sinais_cache[key]) {
                ws_sinais_cache[key].sinais.push(sinal);
            } else {
                ws_sinais_cache[key] = {
                    exchange,
                    cripto1,
                    cripto2,
                    sinais: [sinal]
                };
            };

        });

        // Conecta os sinais no websocket de acordo com a exchange
        Object.keys(ws_sinais_cache).forEach(key => {
            conectar_websocket[ws_sinais_cache[key].exchange](ws_sinais_cache[key]);
        });

    } catch (error) {
        console.log(error.message);
    };
};

module.exports = {
    analisar_sinal,
    inicializa_monitoramento_sinais
};