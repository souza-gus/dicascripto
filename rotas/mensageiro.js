const express = require("express");
const router = express.Router();
const { auto } = require("../banco/sinc_db");
const models = require("../banco/tabelas/init-models")(auto.sequelize);
const { midias_sociais_triggers } = require("../functions/mensageiro");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/mensagens");
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({ storage });

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
            await models.midias_socias_mensagens_arquivos.create({
                arquivo: req_files_arquivo.filename,
                created_by: req_created_by,
                id_mensagem: mensagem.id
            });
        };

        // Salva os arquivos da mensagem no banco de dados
        if (!!req_files_arquivos) {
            req_files_arquivos.forEach(async (arquivo) => {
                await models.midias_socias_mensagens_arquivos.create({
                    arquivo: arquivo.filename,
                    created_by: req_created_by,
                    id_mensagem: mensagem.id
                });
            });
        };

        // Constroi o objeto de categorias da mensagem para salavar no banco em "bulk"
        if (!!req_mensagem_categorias) {

            const categorias_mensagem = await req_mensagem_categorias.map(categoria => {
                return { id_mensagem: mensagem.id, id_categoria_mensagem: categoria.id, created_by: req_created_by }
            });

            // Cria as categorias dessa mensagem no banco
            await models.midias_sociais_mensagens_categorias.bulkCreate(categorias_mensagem);
        };

        // Mandar a mensagem nas midias sociais selecionadas
        if (!!req_midias_sociais) {
            const midias_sociais_grupos_mensagens = req_midias_sociais.map(midia_social => {
                return {
                    created_by: req_created_by,
                    id_mensagem: mensagem.id,
                    id_midia_social_grupo: midia_social.id
                };
            });

            await models.midias_sociais_grupos_mensagens.bulkCreate(midias_sociais_grupos_mensagens);

            req_midias_sociais.forEach(midia_social => {
                midias_sociais_triggers[midia_social.id_midia_social_midias_sociai.codigo](midia_social.destinatario, req_mensagem);
            });
        };

        response.status(200).json({ "mensagem": "Mensagem criada com sucesso" });
    } catch (error) {
        console.log(console.log(error.message))
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
        * 1202654328528044112 iddo discord para teste
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
            midias_sociais_triggers[midia_social.id_midia_social_midias_sociai.codigo](midia_social.destinatario, msg.mensagem)
                .then(async data => {
                    await models.midias_sociais_grupos_mensagens.update({
                        id_status_mensagem: 2,
                        updated_at: auto.sequelize.literal('CURRENT_TIME')
                    }, {
                        where: {
                            id_mensagem: msg.id,
                            id_midia_social_grupo: midia_social.id
                        }
                    });
                })
                .catch(async error => {
                    await models.midias_sociais_grupos_mensagens.update({
                        id_status_mensagem: 3,
                        updated_at: auto.sequelize.literal('CURRENT_TIME')
                    }, {
                        where: {
                            id_mensagem: msg.id,
                            id_midia_social_grupo: midia_social.id
                        }
                    });

                    console.error("Erro durante a requisição:", error.message);
                });
        });

        // Apena usuario isso se quisse que a função fosse sincrona
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
        */

        const midias_sociais_grupos = await models.midias_sociais_grupos.findAll({
            include: {
                model: models.midias_sociais,
                as: "id_midia_social_midias_sociai"
            }
        }).then(midias => JSON.parse(JSON.stringify(midias, 2, null)));

        response.status(200).json(midias_sociais_grupos);
    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;