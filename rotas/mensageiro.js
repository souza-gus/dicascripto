const express = require("express");
const router = express.Router();
const { models } = require("../banco/sinc_db");
const { enviar_mensagem_midia_social, enviar_mensagem } = require("../functions/mensageiro");
const multer = require("multer");
const { pegar_chats_whatsapp, enviar_mensagem_whatsapp } = require("../functions/apps_midias_sociais/whatsapp");
const { ftp_url_arquivo } = require("../functions/ftp");
require("dotenv").config();

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "uploads/mensagens");
//     },
//     filename: (req, file, cb) => {
//         const fileName = `${Date.now()}-${file.originalname}`;
//         cb(null, fileName);
//     },
// });

// const upload = multer({ storage });

const memoryStorage = multer.memoryStorage();
const upload = multer({ storage: memoryStorage });

router.post("/enviar_mensagem", upload.fields([
    { name: "arquivos", maxCount: 5 },
    { name: "arquivo", maxCount: 1 }
]), async (request, response) => {
    try {
        /**
        * Endpoint para enviar mensagens nas midias sociais e criar no banco a mensagem
        * @param {
        *   "created_by": "1"
        *   "mensagem": "Certo",
        *   "mensagem_categorias": [ ...objetos da Tabela "categorias_mensagens" ]
        *   "destinatarios": [ {"id_grupo": 1, "destinatario": "321312", "midia_social_codigo" } ]
        * } request.body
        */

        // Montando requisição para enviar mensagem nas midias sociais
        const req_created_by = request.body.created_by ?? undefined;
        const req_mensagem = request.body.mensagem;

        var req_mensagem_categorias = request.body.mensagem_categorias;
        req_mensagem_categorias = typeof req_mensagem_categorias === "string" ? JSON.parse(req_mensagem_categorias) : req_mensagem_categorias;

        var req_destinatarios = request.body.destinatarios;
        req_destinatarios = typeof req_destinatarios === "string" ? JSON.parse(req_destinatarios) : req_destinatarios;

        const req_files_arquivos = request.files?.arquivos ?? null; // Se um dia for usar js para consumir a API       
        const req_files_arquivo = request.files?.arquivo?.[0] ?? null; // O bubble aceita enviar apenas um arquivo por vez

        const id_mensagem = await enviar_mensagem(req_created_by, req_mensagem, req_mensagem_categorias, req_destinatarios, req_files_arquivos, req_files_arquivo);


        response.status(200).json({ "mensagem": "Mensagem criada com sucesso", id_mensagem });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({ "erro": error.message });
    };
});

router.post("/enviar_mensagem/:id_mensagem", async (request, response) => {
    try {
        /**
        * Endpoint para enviar mensagens nas midias sociais de uma mensagem que já esta no banco de dados
        * @param { id_mensagem } request.params
        * @param {
        *   "midias_sociais": [ ...objetos da Tabela "midias_sociais_grupos" detalhado ]
        * } request.body
        * 
        * 1202654328528044112 id do discord para teste
        */

        const msg = await models.midias_sociais_mensagens.findOne({ where: { id: request.params.id_mensagem } }).then(mensagem => mensagem.toJSON());
        const req_midias_sociais = request.body.midias_sociais;

        // É feito dessa forma para conseguir capturar erros e usa-los como bem entender.
        const promises = req_midias_sociais.map(async midia_social => {

            // Verifica se já existe esse grupo/menssagem na tabela.
            const linha_existente = await models.midias_sociais_grupos_mensagens.findOne({
                where: {
                    id_mensagem: msg.id,
                    id_midia_social_grupo: midia_social.id
                },
                raw: true
            });

            // Só insere a linha se não existir.
            if (linha_existente === null) {
                try {
                    await models.midias_sociais_grupos_mensagens.create({
                        id_mensagem: msg.id,
                        id_midia_social_grupo: midia_social.id,
                        id_status_mensagem: 1
                    });
                } catch (error) {
                    console.log(error.message)
                    return;
                };
            };

            // Envia a mensagem para cada midia_social e trata os erros de acordo.
            const codigo = midia_social.midia_social.codigo;
            const destinatario = midia_social.destinatario;
            const mensagem = msg.mensagem;
            const id_msg = msg.id;
            const id_midia_social_grupo = midia_social.id;
            const imagem = await models.midias_sociais_mensagens_arquivos.findOne({ where: { id_mensagem: id_msg }, raw: true });
            const imagem_path = imagem.arquivo ?? null;

            enviar_mensagem_midia_social(codigo, destinatario, mensagem, id_msg, id_midia_social_grupo, imagem_path);

        });

        // Apenas usar isso se quisesse que a função fosse sincrona
        // await Promise.all(promises);

        response.status(200).json({ "mensagem": "OK" });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({ "erro": error.message });
    };
});

router.get("/midias_sociais_grupos/detalhado", async (request, response) => {
    try {
        /**
        * Endpoint para trazer os grupos das midias sociais de forma detalhada
        *  @param {
        *   pagina: int,
        *   por_pagina: int,
        *   filters: {},
        *   orders: [["created_at", "DESC"], []]
        * } request.params
        */

        // Parâmetros
        var pagina = request.body.pagina || request.query.pagina || null;
        var por_pagina = request.body.por_pagina || request.query.por_pagina || null;
        var orders = request.body.orders || request.query.orders ? [...(request.body.orders || JSON.parse(request.query.orders))] : null;
        var filters = request.body.filters || request.query.filters ? { ...(request.body.filters || JSON.parse(request.query.filters)) } : null;

        // Paginação
        var count = null;
        var total_paginas = null;
        var offset = null;

        if (!!pagina && !!por_pagina) {
            var count = await models.midias_sociais_grupos.count();
            var total_paginas = Math.ceil(count / por_pagina);
            var offset = (pagina - 1) * por_pagina;
        };

        const midias_sociais_grupos = await models.midias_sociais_grupos.findAll({
            include: {
                model: models.midias_sociais,
                as: "midia_social"
            },
            limit: por_pagina,
            offset: offset,
            order: orders,
            where: filters,
        }).then(midias => JSON.parse(JSON.stringify(midias, 2, null)));

        // Retorna a resposta
        response.status(200).json({
            "mensagem": "OK",
            "count": count,
            "total_paginas": total_paginas,
            "pagina": pagina,
            "response": midias_sociais_grupos
        });

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({
            "mensagem": "Ops! Não foi possível recuperar os dados. Por favor, tente novamente.",
            "erro": error.message
        });
    };
});

router.get("/status_envios_mensagem/:id_mensagem", async (request, response) => {
    try {
        /**
        * Endpoint para trazer os status de envio das mensagens nas midias sociais
        */

        const status_envios_mensagem = await models.midias_sociais_grupos_mensagens.findAll({
            where: { id_mensagem: request.params.id_mensagem },
            attributes: ["updated_at"],
            include: [{
                model: models.grupos_mensagens_status,
                as: "status",
                attributes: ["nome", "background_cor", "fonte_cor"]
            }, {
                model: models.midias_sociais_grupos,
                as: "midia_social_grupo",
                attributes: ["nome", "descricao"],
                include: {
                    model: models.midias_sociais,
                    as: "midia_social",
                    attributes: ["nome", "logo", "background_cor", "fonte_cor"]
                }
            }, {
                model: models.midias_sociais_mensagens,
                as: "midia_social_mensagem",
                attributes: ["mensagem"]
            }]
        });

        // Retorna a resposta
        response.status(200).json({
            "mensagem": "OK",
            "count": null,
            "total_paginas": null,
            "pagina": null,
            "response": status_envios_mensagem
        });

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({ "erro": error.message });
    };
});

router.get("/pegar_chats_wahtsapp", async (request, response) => {
    try {
        /**
        * Endpoint para trazer todos os chats do whatsapp
        */

        const grupos = await models.midias_sociais_grupos.findAll({ attributes: ["destinatario"] }).then(grupos => {
            return grupos.map(grupo => grupo.destinatario);
        });

        var chats = await pegar_chats_whatsapp();
        chats = chats.filter(chat => !grupos.includes(chat.phone));

        response.status(200).json({
            "mensagem": "OK",
            "response": chats
        });

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({ "erro": error.message });
    };
});

router.post("/enviar_mensagem_simples", async (request, response) => {
    try {
        /**
        * Endpoint para enviar uma mensagem que não será salva no banco de dados.
        * @param {
        *   "mensagem": "Certo",
        *   "destinatarios": [
        *       {
        *           "codigo": "wpp",
        *           "destinatario": "5518998085885"
        *      },
        *   ]
        * } request.body
        */

        const req_destinatarios = typeof request.body.destinatarios === "string" ? JSON.parse(request.body.destinatarios) : request.body.destinatarios;

        req_destinatarios.forEach(dest => {
            if (dest.codigo === "wpp") {
                enviar_mensagem_whatsapp(dest.destinatario, request.body.mensagem);
            };
        });

        response.status(200).json({
            "mensagem": "OK",
            "response": null
        });

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({
            "mensagem": "Não foi possível encaminhar a senha ao destinatário.",
            "erro": error.message
        });
    };
});

router.get("/midias_sociais/grupos", async (request, response) => {
    try {
        /**
        * Endpoint para trazer as midias sociais juntos com todos os seus grupos
        */

        const midias_sociais_grupos = await models.midias_sociais.findAll({
            include: {
                model: models.midias_sociais_grupos,
                as: "grupos",
                required: true,
                include: {
                    model: models.midias_sociais,
                    as: "midia_social",
                    required: true,
                    attributes: ["codigo", "background_cor", "logo"]
                }
            }
        });

        // Retorna a resposta
        response.status(200).json({
            "mensagem": "OK",
            "response": midias_sociais_grupos
        });

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({
            "mensagem": "Ops! Não foi possível recuperar os dados. Por favor, tente novamente.",
            "erro": error.message
        });
    };
});

router.post("/midias_sociais_grupos", upload.single("arquivo"), async (request, response) => {
    try {
        /**
        * Endpoint para criar grupo de midias sociais
        * @param {
        *   "id_midia_social": 1,
        *   "nome": "",
        *   "descricao": ""
        *   "distinatario": "",
        *   "link_acesso": "",
        * } request.body
        */

        const url_arquivo = request?.file ? await ftp_url_arquivo(request.file) : null;
        await models.midias_sociais_grupos.create({ ...request.body, imagem: url_arquivo });

        response.status(200).json({ "mensagem": "Grupo inserido com sucesso." });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;