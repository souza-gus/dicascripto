const express = require('express');
const router = express.Router();
const { models } = require("../banco/sinc_db");
const { WebsocketStream } = require("@binance/connector");
const { enviar_mensagem } = require('../functions/mensageiro');
const multer = require("multer");

const { conectar_websocket } = require('../functions/sinais');

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

router.post("/criar_sinal", upload.fields([
    { name: "arquivos", maxCount: 5 },
    { name: "arquivo", maxCount: 1 }
]), async (request, response) => {
    try {
        /**
        * Endpoint para enviar mensagens nas midias sociais e criar no banco a mensagem
        * @param {
        *   "created_by": "1"
        *   "mensagem_categorias": [ ...objetos da Tabela "categorias_mensagens" ]
        *   "midias_sociais": [ { "codigo": "wpp", "destinatario": "5518998085885"} ],
        *   "sinal": { ...objeto da Tabela "sinais" },
        *   "cripto": {
        *       "sigla": "BTC",
        *       "id_coingecko": "bitcoin",
        *       "logo_url": ""
        *   }
        * } request.body
        */

        // Pega o body em string ou json
        const req_cripto = typeof request.body.cripto === "string" ? JSON.parse(request.body.cripto) : request.body.cripto;
        const req_sinal = typeof request.body.sinal === "string" ? JSON.parse(request.body.sinal) : request.body.sinal;

        const cripto_existe = await models.criptomoedas.findOne({ where: { sigla: req_cripto.sigla, id_coingecko: req_cripto.id_coingecko } });

        // Se a cripto não existe no banco nós adicionamos
        if (!cripto_existe) {
            var cripto_nova = await models.criptomoedas.create({ ...req_cripto });
        };

        var id_cripto_usada = cripto_existe?.id ?? cripto_nova.id;
        const tether = await models.criptomoedas.findOne({ where: { sigla: "USDT" } });

        const side = await models.sinais_sides.findOne({ where: { id: req_sinal.id_side_sinal } }).then(side => side.codigo);

        var pnl_estimado = side === "long" ? (req_sinal.alvo3 - req_sinal.entrada_inicial) : (req_sinal.entrada_inicial - req_sinal.alvo3);
        pnl_estimado = pnl_estimado * 100 / req_sinal.entrada_inicial;

        var loss_estimado = side === "long" ? (req_sinal.stop - req_sinal.entrada_inicial) : (req_sinal.entrada_inicial - req_sinal.stop);
        loss_estimado = loss_estimado * 100 / req_sinal.entrada_inicial;

        const percentual_capital = (req_sinal.risco_assumido / (loss_estimado * -1)) * 100;
        const margem = percentual_capital / req_sinal.alavancagem;

        const sinal = await models.sinais.create({
            ...req_sinal,
            id_cripto1_sinal: id_cripto_usada,
            id_cripto2_sinal: tether.id,
            preco_momento: req_cripto.preco_momento,
            pnl_estimado: pnl_estimado * req_sinal.alavancagem,
            loss_estimado: loss_estimado * req_sinal.alavancagem,
            percentual_capital,
            margem
        });

        const mensagem = `[b]NOVO SINAL DICAS CRIPTO[/b]

• 👉 [b]ID:[/b] #${sinal.id}
• 👉 [b]Par:[/b] ${req_cripto.sigla}/USDT
• 🐮 [b]Estratégia:[/b] ${side.toUpperCase()}
• 👉 [b]Mercado:[/b] FUTURES
• 👉 [b]Alavancagem:[/b] ${sinal.alavancagem}X
• 👉 [b]Investimento:[/b] ${percentual_capital}% (Margem ${margem}%)
• 👉 [b]Tipo operação:[/b] DAYTRADE
• 💰 [b]Entrada:[/b] ${sinal.entrada_inicial} à ${sinal.entrada_final}
• 🚫 [b]Stop:[/b] ${sinal.stop}
• 🎯 [b]Saídas[/b]
• ⎿  [b]Alvo 1:[/b] ${sinal.alvo1}
• ⎿  [b]Alvo 2:[/b] ${sinal.alvo2}
• ⎿  [b]Alvo 3:[/b] ${sinal.alvo3}`;

        const id_mesangem = await enviar_mensagem(request, mensagem);

        response.status(200).json({ "mensagem": "OK", "erro": null, id_mesangem });
    } catch (error) {

        response.status(500).json({ "mensagem": "Houve complicações com o algoritmo de sinais. Resolva o erro e tente novamente", "erro": error.message });
    };
});

router.post("/monitorar_sinal/:id_sinal", async (request, response) => {
    try {
        /**
        * Endpoint para monitorar um sinal pelo id
        * @param { id_sinal } request.params
        */

        const sinal = await models.sinais.findOne({
            where: {
                id: request.params.id_sinal
            },
            include: [
                { model: models.criptomoedas, as: "id_cripto1_sinal_criptomoeda" },
                { model: models.criptomoedas, as: "id_cripto2_sinal_criptomoeda" },
                { model: models.exchanges, as: "id_exchange_sinal_exchange" }
            ]
        }).then(sinal => sinal.toJSON());

        const par = `${sinal.id_cripto1_sinal_criptomoeda.sigla}${sinal.id_cripto2_sinal_criptomoeda.sigla}`.toLowerCase();
        const exchange = sinal.id_exchange_sinal_exchange.nome.toLowerCase();

        const cache = ws_sinais_cache.filter(cache => cache.exchange === exchange && cache.par === par)[0];

        const objeto_sinal = {
            id: sinal.id,
            id_side_sinal: sinal.id_side_sinal,
            id_tipo_trade_sinal: sinal.id_tipo_trade_sinal,
            id_mercado_sinal: sinal.id_mercado_sinal,
            id_status_sinal: sinal.id_status_sinal,
            ativo: sinal.ativo,
            entrada_inicial: sinal.entrada_inicial,
            entrada_final: sinal.entrada_final,
            alvo1: sinal.alvo1,
            alvo2: sinal.alvo2,
            alvo3: sinal.alvo3,
            stop: sinal.stop,
            pnl_estimado: sinal.pnl_estimado,
            loss_estimado: sinal.loss_estimado,
            percentual_capital: sinal.percentual_capital,
            alavancagem: sinal.alavancagem,
            preco_momento: sinal.preco_momento,
            pnl_resultado: sinal.pnl_resultado
        };

        if (!!cache) {
            cache.sinais.push(objeto_sinal);
        } else {

            const ws_sinais = {
                par,
                exchange,
                sinais: [
                    objeto_sinal
                ]
            };

            ws_sinais_cache.push(ws_sinais);

            const websocket_binance = new WebsocketStream({
                callbacks: {
                    open: () => console.log("Conectado ao servidor Websocket da Binance"),
                    close: () => console.log("Desconectado do servidor Websocket da Binance"),
                    message: (wsdata) => {
                        const data = JSON.parse(wsdata);

                    },
                },
                wsURL: "wss://fstream.binance.com"
            });

            websocket_binance.ticker("tiausdt");
        };

        // const sinal_cache = ws_sinais_cache.filter(cache => );

        response.status(200).json({ "mensagem": "OK" });
    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;