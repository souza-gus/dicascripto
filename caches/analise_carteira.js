const NodeCache = require("node-cache");
const { pegar_critpos_coingecko } = require("../functions/analise_carteira");

// O TTL é definido em segundos. Por exemplo, 3600 segundos = 1 hora
const criptos_coingecko = new NodeCache({ stdTTL: 3600 });
const key_critpos = "criptos";

const get_criptos_coingecko_cache = async () => {
    const criptos = criptos_coingecko.get(key_critpos);
    return criptos ? criptos : set_criptos_coingecko_cache();
};

const set_criptos_coingecko_cache = async () => {
    try {
        const criptos = await pegar_critpos_coingecko();
        criptos_coingecko.set(key_critpos, criptos);

        return criptos;
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);
    };
};

module.exports = {
    get_criptos_coingecko_cache,
    set_criptos_coingecko_cache
}