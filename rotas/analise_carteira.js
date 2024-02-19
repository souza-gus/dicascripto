const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

router.get("/pegar_critpos_coingecko", async (request, response) => {
    try {
        /**
        * Endpoint para trazer todas as criptomedas do CoinGecko
        */

        const criptos = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
                };
                return response.json();
            })
            .then(data => {
                return data;
            })
            .catch(error => {
                console.log(error);
            });

        response.status(200).json({
            "mensagem": "OK",
            "response": criptos
        });

    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

module.exports = router;