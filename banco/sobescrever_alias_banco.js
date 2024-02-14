const sobescrever = (models) => {
    models.midias_sociais_grupos_mensagens.belongsTo(models.grupos_mensagens_status, { as: "status", foreignKey: "id_status_mensagem"});
    models.midias_sociais_grupos_mensagens.belongsTo(models.midias_sociais_grupos, { as: "midia_social_grupo", foreignKey: "id_midia_social_grupo"});
    models.midias_sociais_grupos.belongsTo(models.midias_sociais, { as: "midia_social", foreignKey: "id_midia_social"});
    models.midias_sociais_grupos_mensagens.belongsTo(models.midias_sociais_mensagens, { as: "midia_social_mensagem", foreignKey: "id_mensagem"});
};

module.exports = sobescrever;