const express = require("express");
const rota_mensageiro = require("./mensageiro");
const rota_sinais = require("./sinais");
const { models, auto } = require("../banco/sinc_db");

const rotas = express.Router();
const rotas_dinamicas = express.Router();

Object.keys(models).forEach(model => {
    rotas_dinamicas.post(`/${model}`, async (request, response) => {
        try {
            /**
            * Endpoint para inserção em uma tabela do banco de dados
            * @param request.body
            */

            const parametros = Object.keys(request.body);
            const colunas = models[model].rawAttributes;
            const colunas_ignoradas = ["id", "created_at", "updated_at",]
            const colunas_obrigatorias = Object.keys(colunas).filter(col => colunas[col]["allowNull"] == false && !colunas_ignoradas.includes(col));

            const parametros_faltantes = colunas_obrigatorias.filter(col => !parametros.includes(col));

            if (parametros_faltantes.length > 0) {
                throw new Error(JSON.stringify({ "mesangem": "Parametros Obrigatórios não informados", "parametros": parametros_faltantes }));
            };

            await models[model].create(request.body);

            response.status(200).json({ "mensagem": "OK" });
        } catch (error) {

            var erro_mensagem = error.message;
            try { erro_mensagem = JSON.parse(error.message) } catch (error) { };

            response.status(500).json({ "erro": erro_mensagem });
        };
    });

    rotas_dinamicas.post(`/${model}/bulk`, async (request, response) => {
        try {
            /**
            * Endpoint para inserção em massa
            * É possível inserir uma lista da mesma tabela de uma vez do banco de dados
            * @param request.body
            */

            request.body.forEach(data => {
                const parametros = Object.keys(data);
                const colunas = models[model].rawAttributes;
                const colunas_ignoradas = ["id", "created_at", "updated_at",]
                const colunas_obrigatorias = Object.keys(colunas).filter(col => colunas[col]["allowNull"] == false && !colunas_ignoradas.includes(col));

                const parametros_faltantes = colunas_obrigatorias.filter(col => !parametros.includes(col));

                if (parametros_faltantes.length > 0) {
                    throw new Error(JSON.stringify({ "mesangem": "Parametros Obrigatórios não informados", "parametros": parametros_faltantes }));
                };
            });

            await models[model].bulkCreate([...request.body]);

            response.status(200).json({ "mensagem": "OK" });
        } catch (error) {

            var erro_mensagem = error.message;
            try { erro_mensagem = JSON.parse(error.message) } catch (error) { };

            response.status(500).json({ "erro": erro_mensagem });
        };
    });

    rotas_dinamicas.delete(`/${model}/deleteOne/:id`, async (request, response) => {
        try {
            /**
            * Endpoint para deletear uma linha de uma tabela do banco de dados
            * @param { id } request.params
            */

            await models[model].destroy({ where: { id: request.params.id } });

            response.status(200).json({ "mensagem": "OK" });
        } catch (error) {
            response.status(500).json({ "erro": error.message });
        };
    });

    rotas_dinamicas.delete(`/${model}/bulk`, async (request, response) => {
        try {
            /**
            * Endpoint para deletear linhas em massa de uma tabela do banco de dados
            * @param { [1, 2, 3] } request.body
            */

            await models[model].destroy({ where: { id: [...request.body] } });

            response.status(200).json({ "mensagem": "OK" });
        } catch (error) {
            response.status(500).json({ "erro": error.message });
        };
    });

    rotas_dinamicas.get(`/${model}`, async (request, response) => {
        try {
            /**
            * Endpoint para trazer todos os dados de uma tabela do banco de dados
            * @param {
            *   pagina: int,
            *   por_pagina: int,
            *   filters: {},
            *   orders: [[], []]
            * } request.params
            */

            // Parâmetros
            var pagina = request.body.pagina ? request.body.pagina : null;
            var por_pagina = request.body.por_pagina ? request.body.por_pagina : null;
            var orders = request.body.orders ? [...request.body.orders] : null;
            var filters = request.body.filters ? { ...request.body.filters } : null;

            // Paginação
            var count = null;
            var total_paginas = null;
            var offset = null;

            if (!!pagina && !!por_pagina) {
                var count = await models[model].count();
                var total_paginas = Math.ceil(count / por_pagina);
                var offset = (pagina - 1) * por_pagina;
            };

            // Busca no banco de dados
            var data = await models[model].findAll({
                limit: por_pagina,
                offset: offset,
                order: orders,
                where: filters,
            });

            // Retorna a resposta
            response.status(200).json({
                "message": "OK",
                "count": count,
                "total_paginas": total_paginas,
                "pagina": pagina,
                "response": data
            });

        } catch (error) {
            response.status(500).json({ "erro": error.message });
        };
    });

    rotas_dinamicas.get(`/${model}/findOne`, async (request, response) => {
        try {
            /**
            * Endpoint para trazer apena um dado de uma tabela do banco de dados
            * @param {...} request.body
            */

            const data = await models[model].findOne({ where: { ...request.body } });

            response.status(200).json({ "message": "OK", "response": data });
        } catch (error) {
            response.status(500).json({ "erro": error.message });
        };
    });

    rotas_dinamicas.patch(`/${model}/:id`, async (request, response) => {
        try {
            /**
            * Endpoint para editar uma linha de uma tabela do banco de dados
            * @param { id } request.params
            * @param {  } request.body
            */

            await models[model].update({ ...request.body, updated_at: auto.sequelize.literal('CURRENT_TIME') }, { where: { id: request.params.id } });

            response.status(200).json({ "mensagem": "OK" });
        } catch (error) {
            response.status(500).json({ "erro": error.message });
        };
    });
});

rotas.use("", rotas_dinamicas);
rotas.use("/mensageiro", rota_mensageiro);
rotas.use("/sinais", rota_sinais);

module.exports = rotas;