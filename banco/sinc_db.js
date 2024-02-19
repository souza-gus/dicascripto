const SequelizeAuto = require("sequelize-auto");
const path = require("path");
const sobescrever = require("./sobescrever_alias_banco");
require("dotenv").config();

const auto = new SequelizeAuto(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    directory: path.resolve(process.cwd(), "banco/tabelas"),
    port: process.env.DB_PORT,
    logging: false,
    additional: {
        timestamps: false,
        freezeTableName: true,
        underscored: true,
    },
    pool: {
        max: 10, // Ajuste para menos se você estiver em um plano compartilhado ou se o limite de conexões do DB for baixo
        min: 0,  // Pode ser aumentado se houver um número mínimo de conexões que você sempre quer manter
        idle: 10000, // Mantenha o padrão, a menos que tenha uma boa razão para alterá-lo
        acquire: 30000, // Ajuste baseado em quanto tempo você acha aceitável esperar por uma conexão
    }
});

const sinc_banco = () => {
    auto.run((err) => {
        if (err) {
            throw err;
        }

        console.log("Modelos foram exportados com sucesso!");
    });
};

const sync_sequelize = async (Tabela) => {

    try {
        await Tabela.sync({ alter: true }).then(() => {
            console.log("Banco sincronizado");
        });
    } catch (error) {
        console.log(error.message)
    };

};

// Apenas descomente se for rodar o arquivo na mão: node ./banco/sinc_db.js
// sinc_banco();

const models = require("../banco/tabelas/init-models")(auto.sequelize);
sobescrever(models);

module.exports = { auto, sync_sequelize, models };