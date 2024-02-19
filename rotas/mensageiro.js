const express = require("express");
const router = express.Router();
const { models, auto } = require("../banco/sinc_db");
const { enviar_mensagem_midia_social } = require("../functions/mensageiro");
const multer = require("multer");
const { ftp_upload_arquivo } = require("../functions/ftp");
const { pegar_chats_whatsapp } = require("../functions/apps_midias_sociais/whatsapp");
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
        *   "midias_sociais": [ ...objetos da Tabela "midias_sociais_grupos" detalhado ]
        * } request.body
        */

        const req_created_by = request.body.created_by ?? undefined;
        const req_mensagem = request.body.mensagem;
        const req_mensagem_categorias = JSON.parse(request.body.mensagem_categorias ?? null);
        const req_midias_sociais = JSON.parse(request.body.midias_sociais ?? null);
        const req_files_arquivos = request.files.arquivos; // Se um dia for usar js para consumir a API       
        const req_files_arquivo = request.files.arquivo?.[0] ?? null; // O bubble aceita enviar apenas um arquivo por vez

        // Cria a mensagem no banco
        const mensagem = await models.midias_sociais_mensagens.create({
            mensagem: req_mensagem,
            created_by: req_created_by
        }).then(mensagem => mensagem.toJSON());

        // Salva o arquivo da mensagem no banco de dados
        if (!!req_files_arquivo) {
            const nome_arquivo = `${new Date().getTime()}-${req_files_arquivo.originalname.replace(/\s+/g, '-')}`;
            const url_ftp = process.env.FTP_URL;
            const url_ftp_mensagens = process.env.FTP_UPLOADS_MENSAGENS;
            var url_completa = `${url_ftp}/${url_ftp_mensagens}/${nome_arquivo}`;

            await ftp_upload_arquivo(req_files_arquivo.buffer, `${url_ftp_mensagens}/${nome_arquivo}`)
                .then(async () => {
                    await models.midias_sociais_mensagens_arquivos.create({
                        arquivo: url_completa,
                        created_by: req_created_by,
                        id_mensagem: mensagem.id
                    });
                });
        };

        // Salva os arquivos da mensagem no banco de dados
        if (!!req_files_arquivos) {
            const url_ftp = process.env.FTP_URL;
            const url_ftp_mensagens = process.env.FTP_UPLOADS_MENSAGENS;

            req_files_arquivos.forEach(async (arquivo) => {
                var nome_arquivo = `${new Date().getTime()}-${arquivo.originalname.replace(/\s+/g, '-')}`;
                var url_completa = `${url_ftp}/${url_ftp_mensagens}/${nome_arquivo}`;

                await models.midias_sociais_mensagens_arquivos.create({
                    arquivo: url_completa,
                    created_by: req_created_by,
                    id_mensagem: mensagem.id
                });
            });
        };

        // Constroi o objeto de categorias da mensagem para salavar no banco em "bulk"
        if (!!req_mensagem_categorias) {

            if (Array.isArray(req_mensagem_categorias)) {
                const categorias_mensagem = req_mensagem_categorias.map(categoria => {
                    return { id_mensagem: mensagem.id, id_categoria_mensagem: categoria.id, created_by: req_created_by }
                });

                // Cria as categorias dessa mensagem no banco
                await models.midias_sociais_mensagens_categorias.bulkCreate(categorias_mensagem);
            } else {
                // Cria as categorias dessa mensagem no banco
                await models.midias_sociais_mensagens_categorias.create({
                    id_mensagem: mensagem.id,
                    id_categoria_mensagem: req_mensagem_categorias.id,
                    created_by: req_created_by
                });
            };
        };

        // Mandar a mensagem nas midias sociais selecionadas
        if (!!req_midias_sociais) {
            const midias_sociais_grupos_mensagens = req_midias_sociais.map(midia_social => {
                return {
                    created_by: req_created_by,
                    id_mensagem: mensagem.id,
                    id_midia_social_grupo: midia_social.id,
                    id_status_mensagem: 1
                };
            });

            await models.midias_sociais_grupos_mensagens.bulkCreate(midias_sociais_grupos_mensagens);

            // É feito dessa forma para conseguir capturar erros e usa-los como bem entender.
            const promises = req_midias_sociais.map(async midia_social => {
                // Envia a mensagem para cada midia_social e trata os erros de acordo.
                const codigo = midia_social.id_midia_social_midias_sociai.codigo;
                const destinatario = midia_social.destinatario;
                const msg = req_mensagem;
                const id_msg = mensagem.id;
                var imagem_path = req_files_arquivo ? url_completa : null;

                const id_midia_social_grupo = await models.midias_sociais_grupos_mensagens.findOne({
                    where: {
                        id_mensagem: id_msg,
                        id_midia_social_grupo: midia_social.id
                    },
                    raw: true
                });

                enviar_mensagem_midia_social(codigo, destinatario, msg, id_msg, id_midia_social_grupo.id_midia_social_grupo, imagem_path);
            });
        };

        // Apenas usar isso se quisesse que a função fosse sincrona
        // await Promise.all(promises);

        response.status(200).json({ "mensagem": "Mensagem criada com sucesso", "id_mensagem": mensagem.id });
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
            const codigo = midia_social.id_midia_social_midias_sociai.codigo;
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
                as: "id_midia_social_midias_sociai"
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

        response.status(500).json({ "erro": error.message });
    };
});

router.get("/pegar_chats_wahtsapp", async (request, response) => {
    try {
        /**
        * Endpoint para trazer todos os chats do whatsapp
        */

        const grupos = await models.midias_sociais_grupos.findAll({attributes: ["destinatario"]}).then(grupos => {
            return grupos.map(grupo => grupo.destinatario);
        });

        var chats = await pegar_chats_whatsapp();
        chats = chats.filter(chat => !grupos.includes(chat.phone));
        
        response.status(200).json({
            "mensagem": "OK",
            "response": chats
        });

    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;