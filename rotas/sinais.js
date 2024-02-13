const express = require('express');
const router = express.Router();
const { auto, sync_sequelize } = require("../banco/sinc_db");
const models = require("../banco/tabelas/init-models")(auto.sequelize);
const { WebsocketStream } = require("@binance/connector");
const { midias_sociais_triggers } = require('../functions/mensageiro');
const multer = require("multer");

const { analisar_sinal, conectar_websocket } = require('../functions/sinais');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/sinais");
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({ storage });

router.post("/criar_sinal", upload.array('arquivos'), async (request, response) => {
    try {
        /**
        * Endpoint para criar um sinal no banco de dados e enviar o sinal para as midias sociais desejadas
        * @param {
        *   "created_by": "id" do usuario que criou a requisição,
        *   "sinal": { ...objeto da Tabela "sinais" },
        *   "midias_sociais_grupos": [ ...objetos da Tabela "midias_sociais_grupos" ]
        * } request.body
        */

        // Convertendo o formato da requisição para um valor acessível
        const req_sinal = JSON.parse(request.body.sinal);
        const req_midias_sociais_grupos = JSON.parse(request.body.midias_sociais_grupos ?? null);
        const req_files = request.files;
        const req_created_by = request.body.created_by ?? undefined;

        // Cria o sinal no banco
        const sinal = await models.sinais.create({ ...req_sinal, created_by: req_created_by, }).then(sinal => sinal.toJSON());

        if (!!req_files) {
            // Salvar os arquivos do sinal no banco de dados
            req_files.forEach(async (arquivo) => {
                await models.sinais_arquivos.create({
                    created_by: req_created_by,
                    id_sinal: sinal.id,
                    arquivo: arquivo.filename
                });
            });
        };

        // Insere no banco dados na tabela "sinais_evolucoes"
        await models.sinais_evolucoes.create({
            id_sinal: sinal.id, id_status_sinal: 1,
            mensagem: "certo",
            created_by: req_created_by
        });

        const midias_sociais_grupos = req_midias_sociais_grupos ?? [];

        if (midias_sociais_grupos.length > 0) {

            // Cria o objeto da tabela "sinais_midias_sociais_grupos" para fazer uma inserção em bulk
            const sinais_midias_sociais_grupos = midias_sociais_grupos.map(grupo => {
                return {
                    "id_sinal": sinal.id,
                    "id_midia_social_grupo": grupo.id,
                    "created_by": req_created_by,
                }
            });

            // Insere no banco dados na tabela "sinais_midias_sociais_grupos"
            await models.sinais_midias_sociais_grupos.bulkCreate(sinais_midias_sociais_grupos);

            // Envia a mensagem para todas as midias sociais desejadas
            await midias_sociais_grupos.forEach(grupo => midias_sociais_triggers[grupo.midia_social.codigo](grupo.destinatario, "teste"));
        };

        response.status(200).json({ "mensagem": "OK", "id_sinal": sinal.id });
    } catch (error) {

        response.status(500).json({ "erro": error.message });
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

router.post("/teste", async (request, response) => {
    try {
        /**
        * Endpoint para enviar mensagens nas midias sociais de uma mensagem que já esta no banco de dados
        * @param { id_sinal } request.params
        */

        conectar_websocket.binance(ws_sinais_cache);

        setTimeout(() => {
            ws_sinais_cache.teste = {
                sinais: [1, 2, 3]
            };
        }, 6000);

        response.status(200).json({ "mensagem": "OK" });
    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;