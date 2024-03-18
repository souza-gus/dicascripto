// Função middleware para verificar parâmetros obrigatórios
const validar_parametros_middleware = parametros => (req, res, next) => {
    // Identificar parâmetros ausentes
    const erros = parametros.filter(param => req.body[param] === undefined && req.query[param] === undefined &&req.params[param] === undefined);

    // Se faltarem parâmetros obrigatórios, retorne um erro
    if (erros.length) {
        return res.status(400).json({
            erro: "Parâmetros obrigatórios faltando: " + erros.join(", ")
        });
    };

    // Se todos os parâmetros obrigatórios estiverem presentes, continue
    next();
};

module.exports = validar_parametros_middleware;