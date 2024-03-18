const { models, auto } = require("../../banco/sinc_db");
const { Op } = require('sequelize');
const { ws_sinais_cache } = require("../../caches/sinais_cache");
const { calcular_diferenca_data } = require("../globais");
const { enviar_mensagem } = require("../mensageiro");
const { WebsocketStream } = require("@binance/connector");
const { WebsocketClient, RestClient } = require("okx-api");
const { WebsocketClient: WebsocketClientByBit, RestClientV5 } = require("bybit-api");
const { USDMClient } = require("binance");

// Mepeia  de acordo com o status do sinal
const verifica_status_sinal = {
    "stop": (side, preco_stop, ws_preco_cripto) => (side === "long" && ws_preco_cripto <= preco_stop) || (side === "short" && ws_preco_cripto >= preco_stop),
    "entrada": (side, ei, ef, ws_preco_cripto) => (side === "long" && ws_preco_cripto >= ei && ws_preco_cripto <= ef) || (side === "short" && ws_preco_cripto <= ei && ws_preco_cripto >= ef),
    "alvos": (side, preco_alvo, ws_preco_cripto) => (side === "long" && ws_preco_cripto >= preco_alvo) || (side === "short" && ws_preco_cripto <= preco_alvo)
};

// Mepeia os preços analisados de acordo com o status do sinal
const precos_analisados_sinal = {
    "em_oper": (sinal) => sinal.alvo1,
    "alvo1": (sinal) => sinal.alvo2,
    "alvo2": (sinal) => sinal.alvo3,
};

// Mepeia as mesnagens de alvo de acordo com o status do sinal
const mensagens_alvos_sinal = {
    "agnd_reg_entr": (id, par, tempo_gasto) => `🏁 [b]SEGUUUURA! FOI DADA A LARGADA![/b]

🔘 [b]ID:[/b] #${id}
🔘 [b]Par:[/b] ${par}

📊 O sinal acima acabou de [b]atingir a região de entrada![/b]

🕓 Agora é [b]só aguardar o resultado[/b]!

⚠️ Não se esqueça de configurar sua entrada e [b]gestão de risco[/b] corretamente.

⏰ [b]Tempo desde o envio do sinal:[/b] ${tempo_gasto}
`,
    "em_oper": (id, par, tempo_gasto, pnl) => `🥳  [b]ALVO 1 ATINGIDO[/b]

✅ [b]PNL (Lucro):[/b] +${pnl}%

🔘 [b]ID:[/b] #${id}
🔘 [b]Par:[/b] ${par}
⏰ [b]Tempo desde o envio do sinal:[/b] ${tempo_gasto}
    
🚀 Parabéns pra todos que acompanharam o sinal! 🥳
    
[b]Compartilha aqui o resultado com a gente[/b] 👇
`,

    "alvo1": (id, par, tempo_gasto, pnl) => `🎯  [b]ALVO 2 ATINGIDO[/b]

✅ [b]PNL (Lucro):[/b] +${pnl}%
    
🔘 [b]ID:[/b] #${id}
🔘 [b]Par:[/b] ${par}
⏰ [b]Tempo desde o envio do sinal:[/b] ${tempo_gasto}
        
🚀 Parabéns pra todos que acompanharam o sinal! 🥳
        
[b]Compartilha aqui o resultado com a gente[/b] 👇
`,

    "alvo2": (id, par, tempo_gasto, pnl) => `💰  [b]ALVO 3 ATINGIDO[/b]

✅ [b]PNL (Lucro):[/b] +${pnl}%
    
🔘 [b]ID:[/b] #${id}
🔘 [b]Par:[/b] ${par}
⏰ [b]Tempo desde o envio do sinal:[/b] ${tempo_gasto}
        
🚀 Parabéns pra todos que acompanharam o sinal! 🥳
        
[b]Compartilha aqui o resultado com a gente[/b] 👇
`,
};

// Mepeia os próximos status quando um sinal atinge certas posições
const proximos_status_sinal = {
    "agnd_reg_entr": 2,
    "em_oper": 4,
    "alvo1": 5,
    "alvo2": 6,
};

// Mepeia os códigos de acordo com o id
const status_sinal_codigo = {
    2: "em_oper",
    4: "alvo1",
    5: "alvo2",
};

// Mepeia as mensagens de acordo com o tipo de stop
const msg_stops = {
    "agnd_reg_entr": (id, par, tempo_gasto) => `⚠️ [b]SINAL CANCELADO![/b]

🔘 [b]ID:[/b] #${id}
🔘 [b]Par:[/b] ${par}

O sinal acima [b]não atingiu a região de entrada e foi cancelado[/b] por [b]não atender[/b] mais aos requisitos e parâmetros para uma [b]operação[/b] com [b]potencial saudável de rentabilidade[/b].

⏰ [b]Tempo desde o envio do sinal:[/b] ${tempo_gasto}
`,

    "em_oper": (id, par, tempo_gasto) => `🚫 [b]SINAL STOPADO[/b]
🔘 [b]ID:[/b] #${id}

⚠️ O Sinal [b]${par}[/b] atingiu a ordem de stop loss e protegeu o capital de maiores prejuízos 🙅🏻‍♂️

⏰ [b]Tempo desde o envio do sinal:[/b] ${tempo_gasto}
`
};

// Mepeia os tipos de stop de acordo com o status
const tipos_stops = {
    "agnd_reg_entr": 7,
    "em_oper": 3
};

const enviar_mensagem_evolucao = (id_mensagem, mensagem, id_status_sinal, id_sinal) => {
    models.midias_sociais_grupos_mensagens.findAll({
        where: { id_mensagem },
        include: {
            model: models.midias_sociais_grupos,
            as: "midia_social_grupo",
            attributes: ["destinatario"],
            include: {
                model: models.midias_sociais,
                as: "midia_social",
                attributes: ["codigo", "id"],
            }
        },
    }).then(data => {

        const destinatarios = data.map(midia => {
            return {
                "id_grupo": midia.midia_social_grupo.midia_social.id,
                "destinatario": midia.midia_social_grupo.destinatario,
                "midia_social_codigo": midia.midia_social_grupo.midia_social.codigo
            };
        });

        enviar_mensagem(undefined, mensagem, [{ "id": 1 }], destinatarios, null, null).then(id_mensagem => models.sinais_evolucoes.create({ id_status_sinal, id_sinal, id_mensagem }));

    });
};

const deletar_cache = (key_cache, id_sinal) => {
    if (!key_cache) return;

    if (ws_sinais_cache[key_cache].sinais.length === 1) {
        delete ws_sinais_cache[key_cache];
        return;
    };

    // Encontrar o índice do objeto no array
    let indice = ws_sinais_cache[key_cache].sinais.findIndex(s => s.id === id_sinal);

    // Se o objeto foi encontrado, remover do array
    if (indice !== -1) {
        ws_sinais_cache[key_cache].sinais.splice(indice, 1);
    };

};

const analisar_sinal = (sinal, ws_preco_cripto, key_cache, ultima_verificacao = auto.sequelize.literal("CURRENT_TIME")) => {

    /**
    * Função iniciar o monitoramento dos sinais utilizando o websocket.
    * @param {
    *   id: 1,
    *   entrada_inicial: 69000,
    *   entrada_final: 67000,
    *   alvo1: 60000,
    *   alvo2: 59000,
    *   alvo3: 58000,
    *   stop: 72000,
    *   id_status_sinal: 2,
    *   created_at: 2024-03-04T08:47:23.000Z,
    *   alavancagem: 10,
    *   id_mensagem_sinal: 13,
    *   'cripto1.sigla': 'BTC',
    *   'cripto2.sigla': 'USDT',
    *   'exchange.nome': 'Binance',
    *   'side.codigo': 'short',
    *   'status.codigo': 'em_oper',
    *   'mensagem.id': 13
    * } sinal
    */

    try {

        const side_sinal = sinal["side.codigo"];
        const data_atual = auto.sequelize.literal("CURRENT_TIME");
        const par_mensagem = `${sinal["cripto1.sigla"]}${sinal["cripto2.sigla"]}`;

        // Sempre verifica se bateu o stop pois pode acontceer as seguintes situações:
        // (Invalidado) -> e o sinal não deu região de entrada ou se o sinal bateu alvo 1 ou 2 e voltou para o stop.
        // (Stop) --> Entrou em operação mas stopou.
        if (verifica_status_sinal["stop"](side_sinal, sinal.stop, ws_preco_cripto)) {

            // Faz dessa forma pq o status do sinal só muda se for um dos dois status de "tips_stops"
            // Caso contrario o sinal não tem status trocado pois já atingiu algum alvo
            models.sinais.update({ id_status_sinal: tipos_stops[sinal["status.codigo"]], ativo: false, updated_at: data_atual, ultima_verificacao: ultima_verificacao }, {
                where: { id: sinal.id }
            });

            if (msg_stops[sinal["status.codigo"]]) {
                var mensagem = msg_stops[sinal["status.codigo"]](sinal.id, par_mensagem, calcular_diferenca_data(new Date(sinal.created_at), new Date()));

                enviar_mensagem_evolucao(sinal.id_mensagem_sinal, mensagem, sinal["status.codigo"] === "agnd_reg_entr" ? 7 : 3, sinal.id);
            };

            deletar_cache(key_cache, sinal.id);

            return "concluido";
        };

        // Verifica se bateu take mas não deu região de entrada
        if (verifica_status_sinal["alvos"](side_sinal, sinal["alvo1"], ws_preco_cripto) && sinal["status.codigo"] === "agnd_reg_entr") {
            models.sinais.update({ id_status_sinal: 7, ativo: false, updated_at: data_atual, ultima_verificacao: ultima_verificacao }, {
                where: { id: sinal.id }
            });

            var mensagem = msg_stops["agnd_reg_entr"](sinal.id, par_mensagem, calcular_diferenca_data(new Date(sinal.created_at), new Date()));
            enviar_mensagem_evolucao(sinal.id_mensagem_sinal, mensagem, 7, sinal.id);

            deletar_cache(key_cache, sinal.id);

            return "concluido";
        };

        var proximo_status_sinal = proximos_status_sinal[sinal["status.codigo"]];

        // Verifica se o preço atingiu a região de entrada
        if (sinal["status.codigo"] === "agnd_reg_entr" && verifica_status_sinal["entrada"](side_sinal, sinal.entrada_inicial, sinal.entrada_final, ws_preco_cripto)) {
            models.sinais.update({ id_status_sinal: proximo_status_sinal, updated_at: data_atual, ultima_verificacao: ultima_verificacao }, {
                where: { id: sinal.id }
            });

            var mensagem = mensagens_alvos_sinal[sinal["status.codigo"]](sinal.id, par_mensagem, calcular_diferenca_data(new Date(sinal.created_at), new Date()));
            enviar_mensagem_evolucao(sinal.id_mensagem_sinal, mensagem, proximo_status_sinal, sinal.id);

            sinal["id_status_sinal"] = proximo_status_sinal;
            sinal["status.codigo"] = status_sinal_codigo[proximo_status_sinal];
        };

        // Verifica se bateu algum alvo, o sinal só pode estar com o status em operação
        // Busca o preço a ser analisado, se não tiver preço quer dizer que o sinal ainda não esta em operação
        const preco_alvo = precos_analisados_sinal[sinal["status.codigo"]];
        if (!preco_alvo) return;

        if (verifica_status_sinal["alvos"](side_sinal, preco_alvo(sinal), ws_preco_cripto)) {

            models.sinais.update({ id_status_sinal: proximo_status_sinal, ativo: sinal["status.codigo"] !== "alvo2", updated_at: data_atual, ultima_verificacao: ultima_verificacao }, {
                where: { id: sinal.id }
            });

            var pnl = side_sinal === "long" ? (preco_alvo(sinal) - sinal.entrada_inicial) : (sinal.entrada_inicial - preco_alvo(sinal));
            pnl = ((pnl * 100 / sinal.entrada_inicial) * sinal.alavancagem).toFixed(2);

            var mensagem = mensagens_alvos_sinal[sinal["status.codigo"]](sinal.id, par_mensagem, calcular_diferenca_data(new Date(sinal.created_at), new Date()), pnl);

            enviar_mensagem_evolucao(sinal.id_mensagem_sinal, mensagem, proximo_status_sinal, sinal.id);

            if (sinal["status.codigo"] === "alvo2") {
                deletar_cache(key_cache, sinal.id);
                return "concluido";
            };

            sinal["id_status_sinal"] = proximo_status_sinal;
            sinal["status.codigo"] = status_sinal_codigo[proximo_status_sinal];
        };

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
    };
};

const conectar_websocket = {

    /**
     * @param {
     *  exchange: "binance",
     *  cripto1: "btc",
     *  cripto2: "usdt",
     *  sinais: [ ...objeto da tabela sinais ]
     * } ws_sinal_cache
     */
    binance: (key_cache) => {
        const websocket_binance = new WebsocketStream({
            callbacks: {
                open: () => console.log("Conectado ao servidor Websocket da Binance"),
                close: () => { console.log("\x1b[91m%s\x1b[0m", "Desconectado do servidor Websocket da Binance:", key_cache) },
                error: (err) => { console.error("\x1b[91m%s\x1b[0m", err); },
                message: (wsdata) => {
                    const data = JSON.parse(wsdata);

                    if (!data) return;
                    if (!ws_sinais_cache[key_cache]) websocket_binance.disconnect();

                    ws_sinais_cache[key_cache]?.sinais.forEach(sinal => {
                        if (sinal.analisando) return;
                        sinal.analisando = true;
                        analisar_sinal(sinal, data.c, key_cache);
                        sinal.analisando = false;
                    });

                },
            },
            wsURL: "wss://fstream.binance.com"
        });

        websocket_binance.ticker(`${ws_sinais_cache[key_cache].cripto1.toLowerCase()}${ws_sinais_cache[key_cache].cripto2.toLowerCase()}`);
    },
    okx: (key_cache) => {
        const websocket_okx = new WebsocketClient();

        websocket_okx.subscribe({
            channel: "tickers",
            instId: `${ws_sinais_cache[key_cache].cripto1.toUpperCase()}-${ws_sinais_cache[key_cache].cripto2.toUpperCase()}-SWAP`,
        });

        websocket_okx.on("update", (wsdata) => {
            const wsprice = wsdata["data"][0]["last"];
            if (!wsprice) return;
            if (!ws_sinais_cache[key_cache]) websocket_okx.close();

            ws_sinais_cache[key_cache]?.sinais.forEach(sinal => {
                if (sinal.analisando) return;
                sinal.analisando = true;
                analisar_sinal(sinal, wsprice, key_cache);
                sinal.analisando = false;
            });
        });

        websocket_okx.on("error", (err) => {
            console.error("\x1b[91m%s\x1b[0m", err);
        });
    },
    bybit: (key_cache) => {
        const websocket_bybit = new WebsocketClientByBit({ market: 'v5' });

        websocket_bybit.subscribeV5(
            `tickers.${ws_sinais_cache[key_cache].cripto1.toUpperCase()}${ws_sinais_cache[key_cache].cripto2.toUpperCase()}`,
            "linear"
        );

        websocket_bybit.on("update", (wsdata) => {
            const wsprice = wsdata["data"]["lastPrice"];

            if (!wsprice) return;
            if (!ws_sinais_cache[key_cache]) websocket_bybit.close();

            ws_sinais_cache[key_cache]?.sinais.forEach(sinal => {
                if (sinal.analisando) return;
                sinal.analisando = true;
                analisar_sinal(sinal, wsprice, key_cache);
                sinal.analisando = false;
            });
        });

        websocket_bybit.on("error", (err) => {
            console.error("\x1b[91m%s\x1b[0m", err);
        });
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

        await monitorar_sinais_candles();

        // Busca sinais no banco ativos e que possuem status validos para serem monitorados
        const sinais = await models.sinais.findAll({
            where: {
                id_status_sinal: { [Op.notIn]: [3, 6, 7] },
                ativo: true
            },
            include: [
                { model: models.criptomoedas, as: "cripto1", attributes: ["sigla"] },
                { model: models.criptomoedas, as: "cripto2", attributes: ["sigla"] },
                { model: models.exchanges, as: "exchange", attributes: ["nome"] },
                { model: models.sinais_sides, as: "side", attributes: ["codigo"] },
                { model: models.sinais_status, as: "status", attributes: ["codigo"] },
                { model: models.midias_sociais_mensagens, as: "mensagem", attributes: ["id"] },
            ],
            attributes: ["id", "entrada_inicial", "entrada_final", "alvo1", "alvo2", "alvo3", "stop", "id_status_sinal", "created_at", "alavancagem", "id_mensagem_sinal"],
            raw: true
        });

        if (sinais.length === 0) return;

        monitorar_sinais(sinais);

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error.message);
    };
};

const monitorar_sinais = (sinais) => {
    /**
    * Função iniciar o monitoramento dos sinais utilizando o websocket.
    * @param {
    *   id: 1,
    *   entrada_inicial: 69000,
    *   entrada_final: 67000,
    *   alvo1: 60000,
    *   alvo2: 59000,
    *   alvo3: 58000,
    *   stop: 72000,
    *   id_status_sinal: 2,
    *   created_at: 2024-03-04T08:47:23.000Z,
    *   alavancagem: 10,
    *   id_mensagem_sinal: 13,
    *   'cripto1.sigla': 'BTC',
    *   'cripto2.sigla': 'USDT',
    *   'exchange.nome': 'Binance',
    *   'side.codigo': 'short',
    *   'status.codigo': 'em_oper',
    *   'mensagem.id': 13
    * } sinais
    */

    sinais.forEach(sinal => {

        const exchange = sinal["exchange.nome"].toLowerCase();
        const cripto1 = sinal["cripto1.sigla"].toLowerCase();
        const cripto2 = sinal["cripto2.sigla"].toLowerCase();

        // Monta a key que sera inserida no cache
        const key = `${exchange}_${cripto1}${cripto2}`;

        // Verifica se ja existe a key no cache e adiciona o sinal a lista de sinais do cache existente
        // Se o cache não existe criar o novo objeto no cache
        if (ws_sinais_cache[key]) {
            ws_sinais_cache[key].sinais.push({ ...sinal, analisando: false });
        } else {
            ws_sinais_cache[key] = {
                exchange,
                cripto1,
                cripto2,
                sinais: [{ ...sinal, analisando: false }]
            };
        };
    });

    // Conecta os sinais no websocket de acordo com a exchange
    Object.keys(ws_sinais_cache).forEach(key => {
        conectar_websocket[ws_sinais_cache[key].exchange](key);
    });
};

const monitorar_sinais_candles = async () => {
    /**
     * Função que atualiza os sinais que estão fora do tempo de verificação
     * Utilizada quando inicia o servidor, serve para atualizar os sinais quando o servidor caiu por muito tempo
     */

    const candles_corretoras = {
        "binance": async (start_time_ms, cripto1, cripto2) => {
            try {
                const client_futures_binance = new USDMClient();

                return client_futures_binance.getKlines({
                    symbol: `${cripto1}${cripto2}`.toUpperCase(),
                    interval: "1m",
                    startTime: start_time_ms,
                    limit: "100"
                });
            } catch (error) {
                console.error("\x1b[91m%s\x1b[0m", error);
            };
        },
        "okx": async (start_time_ms, cripto1, cripto2) => {
            try {
                const client_futures_okx = new RestClient();

                const candles = [...await client_futures_okx.getCandles(
                    `${cripto1}-${cripto2}-SWAP`.toUpperCase(),
                    "1m",
                    { before: start_time_ms, limit: 300 }
                )].reverse();

                while ((candles[0][0] - start_time_ms) / (60 * 1000) >= 1) {
                    candles.unshift([...await client_futures_okx.getCandles(
                        `${cripto1}-${cripto2}-SWAP`.toUpperCase(),
                        "1m",
                        { after: candles[0][0], before: start_time_ms, limit: 300 }
                    )].reverse());
                };

                return candles;
            } catch (error) {
                console.error("\x1b[91m%s\x1b[0m", error);
            };
        },
        "bybit": async (start_time_ms, cripto1, cripto2) => {
            try {
                const client_futures_bybit = new RestClientV5();

                return client_futures_bybit.getKline({
                    category: "linear",
                    interval: "1",
                    symbol: `${cripto1}${cripto2}`.toUpperCase(),
                    start: start_time_ms,
                    limit: 200
                }).then(data => data["result"]["list"].reverse());
            } catch (error) {
                console.error("\x1b[91m%s\x1b[0m", error);
            };
        }
    };

    // Busca sinais no banco ativos e que possuem status validos para serem monitorados
    models.sinais.findAll({
        where: {
            ultima_verificacao: {
                [Op.or]: {
                    [Op.eq]: "", // Para sinais que nunca foram verificados
                    [Op.and]: {
                        [Op.ne]: "", // Garante que ultima_verificacao não é vazia
                        // A condição de diferença maior que 30 minutos
                        [Op.lt]: auto.sequelize.literal("NOW() - INTERVAL 30 MINUTE")
                    }
                }
            },
            id_status_sinal: { [Op.notIn]: [3, 6, 7] },
            ativo: true
        },
        include: [
            { model: models.criptomoedas, as: "cripto1", attributes: ["sigla"] },
            { model: models.criptomoedas, as: "cripto2", attributes: ["sigla"] },
            { model: models.exchanges, as: "exchange", attributes: ["nome"] },
            { model: models.sinais_sides, as: "side", attributes: ["codigo"] },
            { model: models.sinais_status, as: "status", attributes: ["codigo"] },
            { model: models.midias_sociais_mensagens, as: "mensagem", attributes: ["id"] },
        ],
        attributes: ["id", "entrada_inicial", "entrada_final", "alvo1", "alvo2", "alvo3", "stop", "id_status_sinal", "created_at", "alavancagem", "id_mensagem_sinal", "ultima_verificacao"],
        raw: true
    }).then(sinais => {
        // Percorre cada sinal
        if (!sinais) return;

        sinais.forEach(async sinal => {
            try {
                const cripto1 = sinal["cripto1.sigla"];
                const cripto2 = sinal["cripto2.sigla"];

                // Percorre cada candle
                const candles = await candles_corretoras[sinal["exchange.nome"].toLowerCase()](new Date(sinal.ultima_verificacao).getTime(), cripto1, cripto2);
                if (!candles) return;

                for (let c of candles) {
                    const analise = analisar_sinal(sinal, c[4], null, c[0]);
                    if (analise === "concluido") return;
                };

                models.sinais.update({ updated_at: auto.sequelize.literal("CURRENT_TIME"), ultima_verificacao: new Date(candles[candles.length - 1][0]) }, {
                    where: { id: sinal.id }
                });
            } catch (error) {
                console.error("\x1b[91m%s\x1b[0m", error);
            };
        });
    });
};

setTimeout(() => {
    var ids_sinais = [];

    try {

        Object.keys(ws_sinais_cache).forEach(key => {
            ws_sinais_cache[key]["sinais"].forEach(sinal => {
                models.sinais.update({ ultima_verificacao: auto.sequelize.literal('CURRENT_TIME') }, { where: { id: sinal.id } });
                ids_sinais.push(sinal.id);
            });
        });

        // Busca sinais no banco ativos e que possuem status 
        // validos para serem monitorados que ainda não estão sendo monitorados

        models.sinais.findAll({
            where: {
                id: { [Op.notIn]: ids_sinais },
                id_status_sinal: { [Op.notIn]: [3, 6, 7] },
                ativo: true
            },
            include: [
                { model: models.criptomoedas, as: "cripto1", attributes: ["sigla"] },
                { model: models.criptomoedas, as: "cripto2", attributes: ["sigla"] },
                { model: models.exchanges, as: "exchange", attributes: ["nome"] },
                { model: models.sinais_sides, as: "side", attributes: ["codigo"] },
                { model: models.sinais_status, as: "status", attributes: ["codigo"] },
                { model: models.midias_sociais_mensagens, as: "mensagem", attributes: ["id"] },
            ],
            attributes: ["id", "entrada_inicial", "entrada_final", "alvo1", "alvo2", "alvo3", "stop", "id_status_sinal", "created_at", "alavancagem", "id_mensagem_sinal"],
            raw: true
        }).then(sinais => {
            if (sinais.length < 1) return;
            monitorar_sinais(sinais);
        });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
    };

}, 1800000);

module.exports = {
    inicializa_monitoramento_sinais,
    monitorar_sinais
};

