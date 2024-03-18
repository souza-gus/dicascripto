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

const enviar_mensagem = async (created_by, mensagem, mensagem_categorias, destinatarios, arquivos, arquivo) => {
    // Cria a mensagem no banco
    const mensagem_banco = await models.midias_sociais_mensagens.create({
        mensagem: mensagem,
        created_by: created_by
    }).then(mensagem => mensagem.toJSON());

    // Salva o arquivo da mensagem no banco de dados
    if (arquivo) {
        const nome_arquivo = `${new Date().getTime()}-${arquivo.originalname.replace(/\s+/g, '-')}`;
        const url_ftp = process.env.FTP_URL;
        const url_ftp_mensagens = process.env.FTP_UPLOADS_MENSAGENS;
        var url_completa = `${url_ftp}/${url_ftp_mensagens}/${nome_arquivo}`;

        await ftp_upload_arquivo(arquivo.buffer, `${url_ftp_mensagens}/${nome_arquivo}`)
            .then(async () => {

                await models.midias_sociais_mensagens_arquivos.create({
                    arquivo: url_completa,
                    created_by: created_by,
                    id_mensagem: mensagem_banco.id
                });
            });

    };

    // Salva os arquivos da mensagem no banco de dados
    if (arquivos) {
        const url_ftp = process.env.FTP_URL;
        const url_ftp_mensagens = process.env.FTP_UPLOADS_MENSAGENS;

        arquivos.forEach(async (arquivo) => {
            var nome_arquivo = `${new Date().getTime()}-${arquivo.originalname.replace(/\s+/g, '-')}`;
            var url_completa = `${url_ftp}/${url_ftp_mensagens}/${nome_arquivo}`;

            await models.midias_sociais_mensagens_arquivos.create({
                arquivo: url_completa,
                created_by: created_by,
                id_mensagem: mensagem_banco.id
            });
        });
    };

    // Constroi o objeto de categorias da mensagem para salavar no banco em "bulk"
    if (mensagem_categorias) {

        if (Array.isArray(mensagem_categorias)) {
            const categorias_mensagem = mensagem_categorias.map(categoria => {
                return { id_mensagem: mensagem_banco.id, id_categoria_mensagem: categoria.id, created_by: created_by }
            });

            // Cria as categorias dessa mensagem no banco
            await models.midias_sociais_mensagens_categorias.bulkCreate(categorias_mensagem);
        } else {
            // Cria as categorias dessa mensagem no banco
            await models.midias_sociais_mensagens_categorias.create({
                id_mensagem: mensagem_banco.id,
                id_categoria_mensagem: mensagem_categorias.id,
                created_by: created_by
            });
        };
    };

    // Mandar a mensagem nas midias sociais selecionadas
    if (destinatarios) {
        const midias_sociais_grupos_mensagens = destinatarios.map(dest => {
            return {
                created_by: created_by,
                id_mensagem: mensagem_banco.id,
                id_midia_social_grupo: dest.id_grupo,
                id_status_mensagem: 1
            };
        });

        await models.midias_sociais_grupos_mensagens.bulkCreate(midias_sociais_grupos_mensagens);

        // É feito dessa forma para conseguir capturar erros e usa-los como bem entender.
        const promises = destinatarios.map(async dest => {
            // Envia a mensagem para cada midia_social e trata os erros de acordo.
            const codigo = dest.midia_social_codigo;
            const destinatario = dest.destinatario;
            const msg = mensagem;
            const id_msg = mensagem_banco.id;
            var imagem_path = arquivo ? url_completa : null;

            const id_midia_social_grupo = await models.midias_sociais_grupos_mensagens.findOne({
                where: {
                    id_mensagem: id_msg,
                    id_midia_social_grupo: dest.id_grupo
                },
                raw: true
            });

            enviar_mensagem_midia_social(codigo, destinatario, msg, id_msg, id_midia_social_grupo.id_midia_social_grupo, imagem_path);
        });
    };

    // Apenas usar isso se quisesse que a função fosse sincrona
    // await Promise.all(promises);
    return mensagem_banco.id
};

const enviar_mensagem_simples = (destinatarios, mensagem) => {
    destinatarios.forEach(dest => {
        midias_sociais_triggers[dest.midia_social_codigo](dest.destinatario, mensagem);
    });
};

module.exports = {
    enviar_mensagem_midia_social,
    enviar_mensagem,
    enviar_mensagem_simples
};