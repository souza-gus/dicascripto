const sobescrever = (models) => {
    models.midias_sociais_grupos_mensagens.belongsTo(models.grupos_mensagens_status, { as: "status", foreignKey: "id_status_mensagem" });
    models.midias_sociais_grupos_mensagens.belongsTo(models.midias_sociais_grupos, { as: "midia_social_grupo", foreignKey: "id_midia_social_grupo" });
    models.midias_sociais_grupos_mensagens.belongsTo(models.midias_sociais_mensagens, { as: "midia_social_mensagem", foreignKey: "id_mensagem" });

    models.midias_sociais_mensagens.hasMany(models.midias_sociais_grupos_mensagens, { as: "grupos", foreignKey: "id_mensagem"});

    models.midias_sociais_grupos.belongsTo(models.midias_sociais, { as: "midia_social", foreignKey: "id_midia_social" });

    models.midias_sociais.hasMany(models.midias_sociais_grupos, { as: "grupos", foreignKey: "id_midia_social"});

    models.sinais.belongsTo(models.criptomoedas, { as: "cripto1", foreignKey: "id_cripto1_sinal" });
    models.sinais.belongsTo(models.criptomoedas, { as: "cripto2", foreignKey: "id_cripto2_sinal" });
    models.sinais.belongsTo(models.exchanges, { as: "exchange", foreignKey: "id_exchange_sinal" });
    models.sinais.belongsTo(models.sinais_sides, { as: "side", foreignKey: "id_side_sinal" });
    models.sinais.belongsTo(models.sinais_status, { as: "status", foreignKey: "id_status_sinal" });
    models.sinais.belongsTo(models.midias_sociais_mensagens, { as: "mensagem", foreignKey: "id_mensagem_sinal" });
};

module.exports = sobescrever;