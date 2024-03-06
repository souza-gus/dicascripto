const { models, auto } = require("../banco/sinc_db");
const { enviar_mensagem_discord } = require('./apps_midias_sociais/discord');
const { enviar_mensagem_whatsapp } = require('./apps_midias_sociais/whatsapp');
const { enviar_mensagem_telegram } = require('./apps_midias_sociais/telegram');
const { ftp_upload_arquivo } = require("../functions/ftp");
require("dotenv").config();

const midias_sociais_triggers = {
    "wpp": (destinatario, mensagem, imagem_path) => {
        return enviar_mensagem_whatsapp(destinatario, mensagem, imagem_path)
    },
    "tgram": (destinatario, mensagem, imagem_path) => {
        return enviar_mensagem_telegram(destinatario, mensagem, imagem_path);
    },
    "disc": (destinatario, mensagem, imagem_path) => {
        return enviar_mensagem_discord(destinatario, mensagem, imagem_path);
    }
};

const enviar_mensagem_midia_social = (codigo, destinatario, mensagem, id_msg, id_midia_social_grupo, imagem_path) => {
    try {
        midias_sociais_triggers[codigo](destinatario, mensagem, imagem_path)
            .then(async data => {

                await models.midias_sociais_grupos_mensagens.update({
                    id_status_mensagem: 2,
                    updated_at: auto.sequelize.literal('CURRENT_TIME')
                }, {
                    where: {
                        id_mensagem: id_msg,
                        id_midia_social_grupo: id_midia_social_grupo
                    }
                });
            })
            .catch(async error => {
                await models.midias_sociais_grupos_mensagens.update({
                    id_status_mensagem: 3,
                    updated_at: auto.sequelize.literal('CURRENT_TIME')
                }, {
                    where: {
                        id_mensagem: id_msg,
                        id_midia_social_grupo: id_midia_social_grupo
                    }
                });

                console.error("\x1b[91m%s\x1b[0m", `Codigo da midia social: ${codigo}\nErro durante a requisição: ${error.message}`);
            });
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
    };
};

const enviar_mensagem = async (request, mensagem_customizada) => {

    const req_created_by = request.body.created_by ?? undefined;
    const req_mensagem = mensagem_customizada ? mensagem_customizada : request.body.mensagem;

    var req_mensagem_categorias = request.body.mensagem_categorias;
    req_mensagem_categorias = typeof req_mensagem_categorias === "string" ? JSON.parse(req_mensagem_categorias) : req_mensagem_categorias;

    var req_midias_sociais = request.body.midias_sociais;
    req_midias_sociais = typeof req_midias_sociais === "string" ? JSON.parse(req_midias_sociais) : req_midias_sociais;

    const req_files_arquivos = request.files?.arquivos ?? null; // Se um dia for usar js para consumir a API       
    const req_files_arquivo = request.files?.arquivo?.[0] ?? null; // O bubble aceita enviar apenas um arquivo por vez

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
    return mensagem.id
};

module.exports = {
    enviar_mensagem_midia_social,
    enviar_mensagem
};