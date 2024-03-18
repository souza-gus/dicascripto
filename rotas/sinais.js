const express = require("express");
const router = express.Router();
const { models } = require("../banco/sinc_db");
const { enviar_mensagem, enviar_mensagem_simples } = require("../functions/mensageiro");
const multer = require("multer");
const { monitorar_sinais } = require("../functions/sinais/monitoramento_sinais");
const validar_parametros_middleware = require("../middlewares/verifica_parametros");
const { verificar_parametros } = require("../functions/globais");
const puppeteer = require("puppeteer");


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
        *   "destinatarios": [ {"id_grupo": 1, "destinatario": "321312", "midia_social_codigo" } ],
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
        req_cripto.sigla = req_cripto.sigla.replace(/[^a-zA-Z0-9]/g, '');

        const req_sinal = typeof request.body.sinal === "string" ? JSON.parse(request.body.sinal) : request.body.sinal;

        if (!req_cripto.sigla) {
            throw new Error("Atenção: Selecione um par de criptomoedas.");
        };

        // Pega o código do side
        const side = await models.sinais_sides.findOne({ where: { id: req_sinal.id_side_sinal } }).then(side => side.codigo);

        // Validar parâmetros obrigatorios
        const params_sinal = verificar_parametros(req_sinal, [
            "id_side_sinal",
            "id_tipo_trade_sinal",
            "id_mercado_sinal",
            "id_exchange_sinal",
            "ativo",
            "entrada_inicial",
            "entrada_final",
            "alvo1",
            "alvo2",
            "alvo3",
            "stop",
            "alavancagem",
            "risco_assumido",
            "preco_momento"
        ]);

        if (!params_sinal.valido) throw new Error(params_sinal.mensagem);

        const params_cripto = verificar_parametros(req_cripto, [
            "nome",
            "sigla",
            "id_coingecko",
        ]);

        if (!params_cripto.valido) throw new Error(params_cripto.mensagem);

        // Valida as entradas de acordo com o side
        if (side === "long" && req_sinal.entrada_final < req_sinal.entrada_inicial) {
            throw new Error("Atenção: Operação de LONG, o preço da entrada final precisa ser maior que o preço da entrada inicial");
        };

        if ((side === "short" && req_sinal.entrada_final > req_sinal.entrada_inicial)) {
            throw new Error("Atenção: Operação de SHORT, o preço da entrada inicial precisa ser maior que o preço da entrada final");
        };

        const cripto_existe = await models.criptomoedas.findOne({ where: { sigla: req_cripto.sigla, id_coingecko: req_cripto.id_coingecko } });

        // Se a cripto não existe no banco nós adicionamos
        if (!cripto_existe) {
            var cripto_nova = await models.criptomoedas.create({ ...req_cripto });
        };

        var id_cripto_usada = cripto_existe?.id ?? cripto_nova.id;
        const tether = await models.criptomoedas.findOne({ where: { sigla: "USDT" } });

        var pnl_estimado = side === "long" ? (req_sinal.alvo3 - req_sinal.entrada_inicial) : (req_sinal.entrada_inicial - req_sinal.alvo3);
        pnl_estimado = pnl_estimado * 100 / req_sinal.entrada_inicial;

        var loss_estimado = side === "long" ? (req_sinal.stop - req_sinal.entrada_inicial) : (req_sinal.entrada_inicial - req_sinal.stop);
        loss_estimado = loss_estimado * 100 / req_sinal.entrada_inicial;

        const percentual_capital = (req_sinal.risco_assumido / (loss_estimado * -1)) * 100;
        const margem = percentual_capital / req_sinal.alavancagem;

        const sinal = await models.sinais.create({
            ...req_sinal,
            id_status_sinal: 1,
            id_cripto1_sinal: id_cripto_usada,
            id_cripto2_sinal: tether.id,
            pnl_estimado: Number(pnl_estimado * req_sinal.alavancagem).toFixed(2),
            loss_estimado: Number(loss_estimado * req_sinal.alavancagem).toFixed(2),
            percentual_capital: Number(percentual_capital).toFixed(2),
            margem: Number(margem).toFixed(2)
        });

        const mensagem = `[b]NOVO SINAL DICAS CRIPTO[/b]

• 👉 [b]ID:[/b] #${sinal.id}
• 👉 [b]Par:[/b] ${req_cripto.sigla}/USDT
• ${side === "long" ? "🐮" : "🐻"} [b]Estratégia:[/b] ${side.toUpperCase()}
• 👉 [b]Mercado:[/b] FUTURES
• 👉 [b]Alavancagem:[/b] ${sinal.alavancagem}X
• 👉 [b]Investimento:[/b] ${sinal.percentual_capital}% (Margem ${sinal.margem}%)
• 👉 [b]Tipo operação:[/b] DAYTRADE
• 💰 [b]Entrada:[/b] ${sinal.entrada_inicial} à ${sinal.entrada_final}
• 🚫 [b]Stop:[/b] ${sinal.stop}
• 🎯 [b]Saídas[/b]
• ⎿  [b]Alvo 1:[/b] ${sinal.alvo1}
• ⎿  [b]Alvo 2:[/b] ${sinal.alvo2}
• ⎿  [b]Alvo 3:[/b] ${sinal.alvo3}`;

        // Montando requisição para enviar mensagem nas midias sociais
        const req_created_by = request.body.created_by ?? undefined;

        var req_mensagem_categorias = request.body.mensagem_categorias;
        req_mensagem_categorias = typeof req_mensagem_categorias === "string" ? JSON.parse(req_mensagem_categorias) : req_mensagem_categorias;

        var req_destinatarios = request.body.destinatarios;
        req_destinatarios = typeof req_destinatarios === "string" ? JSON.parse(req_destinatarios) : req_destinatarios;

        const req_files_arquivos = request.files?.arquivos ?? null; // Se um dia for usar js para consumir a API       
        const req_files_arquivo = request.files?.arquivo?.[0] ?? null; // O bubble aceita enviar apenas um arquivo por vez

        // Faz todo o processo de criação de mensagem e envio de mensagem
        const id_mensagem = await enviar_mensagem(req_created_by, mensagem, req_mensagem_categorias, req_destinatarios, req_files_arquivos, req_files_arquivo);

        // Envia uma mensagem informativa depois de enviar o sinal.
        setTimeout(() => {
            enviar_mensagem_simples(req_destinatarios, `🤔 NÃO SABE COMO COPIAR NOSSOS SINAIS PRA COMEÇAR A LUCRAR?

🔥 [b]ACESSE AGORA NOSSO MATERIAL EXCLUSIVO[/b] 🔥
👉 https://secure.doppus.com/sale/SZZJOZ8EZZJOZ8EJHHOZO`);
        }, 4000);

        // Cria a primeira evolução da Critpo
        await models.sinais_evolucoes.create({ id_sinal: sinal.id, id_status_sinal: 1, id_mensagem });

        // Atualiza o sinal com o id da mensagem original
        await models.sinais.update({ id_mensagem_sinal: id_mensagem }, { where: { id: sinal.id } });

        // Busca o sinal no banco com o formato que precisa ter para ser monitorado
        const sinal_monitorado = await models.sinais.findOne({
            where: { id: sinal.id },
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

        monitorar_sinais([sinal_monitorado]);

        response.status(200).json({ "mensagem": "Sinal criado com sucesso!", "erro": null, id_mensagem });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({ "mensagem": error.message, "erro": error.message });
    };
});

router.post("/monitorar_sinal/:id_sinal", async (request, response) => {
    try {
        /**
        * Endpoint para monitorar um sinal pelo id
        * @param { id_sinal } request.params
        */

        response.status(200).json({ "mensagem": "OK" });
    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

router.get("/teste", async (request, response) => {
    try {
        // Iniciar o navegador
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Definir o conteúdo HTML. Aqui você pode inserir o valor dinamicamente.
        const valorPNL = req.query.valor; // Assume que o valor é passado como query parameter
        const conteudoHTML = `<html><body><h1>PNL: ${valorPNL}</h1></body></html>`;

        await page.setContent(conteudoHTML);

        // Gerar a imagem a partir do HTML
        const imagem = await page.screenshot({ format: 'png' });

        // Fechar o navegador
        await browser.close();

        // Enviar a imagem como resposta
        response.setHeader('Content-Type', 'image/png');
        response.send(imagem);

        // response.status(200).json({ "mensagem": "OK" });
    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;