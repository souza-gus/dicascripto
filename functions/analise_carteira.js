const fetch = require("node-fetch");
const { Spot } = require('@binance/connector');

const client_spot_binance = new Spot();

const pegar_critpos_coingecko = () => new Promise((resolve, reject) => {
    fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250", {
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
            resolve(data);
        })
        .catch(error => {
            reject(error);
        });
});

// Exemplo de implementação da SMA (Média Móvel Simples)
function sma(source, length) {
    let sum = 0;

    for (let i = 0; i < length; i++) {
        sum += source[i];
    };

    return sum / length;
};

// Implementação da RMA (uma variante da EMA usada no RSI)
function rma(source, length) {
    let alpha = 1 / length;
    let sum = 0;
    let isFirst = true;
    for (let i = 0; i < source.length; i++) {
        if (isFirst) {
            sum = sma(source.slice(0, length), length); // Use SMA para o primeiro valor
            isFirst = false;
        } else {
            sum = alpha * source[i] + (1 - alpha) * sum;
        };
    };
    return sum;
};

// Cálculo do RSI
function calculateRSI(close_prices, length) {
    let change = close_prices.map((curr, index, arr) => index === 0 ? 0 : curr - arr[index - 1]);
    let gains = change.map(c => Math.max(c, 0));
    let losses = change.map(c => Math.max(-c, 0));

    let avgGain = rma(gains, length);
    let avgLoss = rma(losses, length);

    let rs = avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    return rsi;
};

const calcular_rsi_cripto = async (sigla = 'btc', interval = '1d', limit = 100) => {
    try {
        const response = await client_spot_binance.klines(`${sigla}USDT`.toUpperCase(), interval, { limit }).catch(error => {
            // se falhar a busca na binance tenta usar outra exchange para pegar a informação dos candles
            throw error;
        });
        const closingPrices = await response.data.map(kline => parseFloat(kline[4]));
        const rsi = calculateRSI(closingPrices, 14);

        return rsi;
    } catch (error) {
        // console.log(error.message);
        throw error.message;
    };
};

function gerar_mensagem_rsi(rsi, sigla) {
    const faixas_rsi = [
        {
            limiteInferior: 80, mensagens: [
                `Extrema CAUTELA! A análise de nossa inteligência artificial, apresenta a criptomoeda ${sigla} com um patamar de extrema valorização. Baseando-se em diversos dados e informações, dentre elas: Indicadores, menções em redes sociais, análise de sentimento e várias outras, nossa inteligência artificial enxerga uma possibilidade de captura de lucros e reavaliação estratégica das posições atuais para esta cripto. Esse movimento poderia trazer novas oportunidades para o portfólio, buscando oportunidades com maior margem de crescimento. Nossa I.A irá te apresentar uma possibilidade de rebalanceamento ao final desta análise.`,
                `ALERTA MÁXIMO! A avaliação feita pela nossa I.A destaca a criptomoeda ${sigla} num nível de valorização surpreendente. A partir de uma ampla gama de dados, incluindo análises de mercado, menções sociais e sentimentos, identificamos um forte potencial para a realização de lucros e ajustes estratégicos nas alocações atuais. Esta pode ser uma chance de diversificar o portfólio com ativos de alto crescimento. Fique atento às recomendações de rebalanceamento ao concluir esta análise.`,
                `CUIDADO EXTREMO! Nossa inteligência artificial aponta a criptomoeda ${sigla} como altamente valorizada, após um exame detalhado de variáveis como indicadores de mercado, popularidade em redes e análises emocionais. Vemos uma grande oportunidade para otimizar ganhos e reconsiderar estratégias de investimento. Esta análise sugere a possibilidade de redefinir o portfólio para maximizar o potencial de crescimento. Aguarde as sugestões de nossa I.A para ajustes no final deste relatório.`,
                `VIGILÂNCIA ELEVADA! Segundo nossa análise de inteligência artificial, a criptomoeda ${sigla} está num patamar de alta significativa. Com base em um leque de informações, incluindo indicadores técnicos e menções online, percebemos uma oportunidade ímpar de capitalizar lucros e reavaliar as posições correntes. Este cenário abre portas para enriquecer o portfólio com opções de maior potencial de valorização. As propostas de realocação da nossa I.A serão apresentadas ao término desta análise.`,
                `EXTREMA VIGILÂNCIA REQUERIDA! A análise preditiva de nossa inteligência artificial coloca a criptomoeda ${sigla} em uma fase de valorização notável. Utilizando uma diversidade de dados, incluindo análise de sentimentos e atividade nas redes sociais, identificamos uma janela estratégica para lucros e reajuste das atuais posições de investimento. Este ajuste propõe explorar novas oportunidades de alto retorno. Detalhes sobre o rebalanceamento sugerido por nossa I.A serão compartilhados após esta análise.`
            ]
        },
        {
            limiteInferior: 70, mensagens: [
                `Atenção! A análise realizada indica que a criptomoeda ${sigla} apresenta um desempenho robusto dentro do prazo mencionado. Seria prudente considerar a reorganização das alocações atuais para proteger ganhos e redistribuir recursos de maneira a explorar novas áreas com potencial de valorização. Confira a possibilidade de rebalanceamento de carteira, sugerida por nossa I.A ao final desta análise.`,
                `FOCO! A nossa inteligência artificial identificou que a criptomoeda ${sigla} tem mostrado um desempenho sólido recentemente. É recomendável revisar e possivelmente reestruturar as alocações de investimento para salvaguardar lucros já realizados e realocar capital para maximizar futuras valorizações. Uma estratégia de rebalanceamento será proposta ao final desta análise.`,
                `PRESTE ATENÇÃO! De acordo com a nossa análise de I.A, a criptomoeda ${sigla} está em uma trajetória de crescimento estável. Agora pode ser o momento ideal para reavaliar e ajustar as posições de investimento atuais, com o objetivo de capturar ganhos e realocar para ativos com maior potencial. As recomendações para ajustes na carteira serão disponibilizadas ao concluir esta análise.`,
                `OLHAR CRÍTICO! A análise de nossa inteligência artificial sinaliza que a criptomoeda ${sigla} vem apresentando um desempenho forte. Avaliar a redistribuição das alocações pode ser uma jogada inteligente para proteger os lucros e reinvestir em áreas com perspectivas de alta valorização. Aguarde as orientações de rebalanceamento sugeridas ao fim desta análise.`,
                `ATENÇÃO REFORÇADA! A criptomoeda ${sigla} demonstra um robusto desempenho, conforme análise de nossa I.A. Considerar uma revisão das alocações atuais poderia ser estratégico para consolidar ganhos e redirecionar investimentos para segmentos promissores. As opções de rebalanceamento serão detalhadas após esta análise.`
            ]
        },
        {
            limiteInferior: 50, mensagens: [
                `Hmmm. Interesante.. Nossa I.A observou que a criptomoeda ${sigla} se mantém em uma posição de equilíbrio. Uma possível idéia, seria a realização de ajustes finos nas alocações, visando capturar potenciais de valorizações futuras, conforme indicado por análise de tendências de mercado avaliadas. Nossa I.A também esboçou uma possibilidade de realocação destes valores ao final desta análise.`,
                `ANÁLISE: A criptomoeda ${sigla} encontra-se estável, segundo nossa inteligência artificial. Ajustes estratégicos nas alocações podem ser benéficos para aproveitar futuras oportunidades de crescimento, baseando-se em projeções de mercado. Explore as sugestões de realocação preparadas pela nossa I.A no encerramento desta análise.`,
                `CONSIDERAÇÃO: Após uma análise cuidadosa, nossa I.A indica que ${sigla} apresenta estabilidade no mercado. Pode ser o momento ideal para refinar o portfólio, buscando otimizar o potencial de valorização. Recomendações para ajustes serão fornecidas ao final deste estudo.`,
                `OBSERVAÇÃO: A criptomoeda ${sigla} mostra-se equilibrada, revela nossa inteligência artificial. Refinamentos nas alocações atuais podem desbloquear valorizações futuras, de acordo com análises de tendência. Aguarde as propostas de nossa I.A para realocações ao término desta análise.`,
                `PONTO DE EQUILÍBRIO: ${sigla} mantém-se estável, aponta a análise de nossa I.A. Considerações para pequenos ajustes nas alocações podem ser sábias para capturar crescimentos futuros. Detalhes sobre como realocar investimentos serão apresentados ao final desta análise.`,
            ]
        },
        {
            limiteInferior: 30, mensagens: [
                `Oportunidade à vista? A partir da análise de mercado, bem como vários indicadores e menções de redes sociais, percebe-se que a criptomoeda ${sigla} encontra-se em um ponto, que pode indicar uma oportunidade de reforço nas posições. Essa abordagem visa antecipar-se a possíveis movimentos de alta, baseando-se em um estudo detalhado do comportamento histórico e projeções futuras. Nossa I.A também fez um esboço de possibilidade de como realocar as posições para este ativo.`,
                `VISLUMBRE DE OPORTUNIDADE: A análise detalhada do mercado e indicadores, incluindo atividade nas redes sociais, sugere que ${sigla} está em um momento crucial, possivelmente propício para aumentar investimentos. Este insight busca aproveitar tendências ascendentes, com base em dados históricos e expectativas futuras. Sugestões de realocação pela nossa I.A serão compartilhadas em breve.`,
                `MOMENTO DECISIVO: Nossa inteligência artificial identificou que a criptomoeda ${sigla} pode estar se aproximando de um ponto de inflexão, indicando uma boa chance de fortalecer posições. Com base em análises profundas e projeções, é aconselhável considerar esta possibilidade. Estratégias de realocação serão esboçadas ao concluir a análise.`,
                `POTENCIAL DE CRESCIMENTO: De acordo com nossa análise, ${sigla} apresenta sinais de uma oportunidade emergente para reforçar o investimento. Análises de mercado e indicadores sociais fundamentam essa perspectiva, antecipando possíveis ganhos. Recomendações de realocação serão detalhadas ao final deste relatório.`,
                `CHANCE DE AMPLIAÇÃO: A posição atual de ${sigla}, enriquecida por análises de mercado e menções sociais, sugere um momento oportuno para aumentar a exposição. Esta estratégia visa capturar potenciais altas, orientada por uma avaliação meticulosa. Detalhes sobre ajustes sugeridos serão fornecidos após esta análise.`,
            ]
        },
        {
            limiteInferior: 20, mensagens: [
                `A inteligência de dados sugere que a criptomoeda ${sigla} está bastante subvalorizada, o que aponta para uma estratégia de aumento de posição. Essa decisão é apoiada por uma análise profunda, visando maximizar os retornos no prazo desta análise, através de um posicionamento estratégico mais agressivo.`,
                `SUBVALORIZAÇÃO NOTÁVEL: Nossa análise indica que ${sigla} está significativamente subvalorizada, sugerindo uma oportunidade para intensificar investimentos. Baseando-se em uma avaliação detalhada, esta abordagem busca otimizar retornos através de uma postura mais assertiva no mercado.`,
                `ALERTA DE SUBVALORIZAÇÃO: De acordo com nossos dados, ${sigla} apresenta uma valoração inferior ao seu potencial real, recomendando um incremento nas posições. A análise aprofundada suporta uma estratégia de engajamento mais ousada para capitalizar sobre esta discrepância.`,
                `OPORTUNIDADE DE VALORIZAÇÃO: A criptomoeda ${sigla} está, segundo nossas análises, em um nível de subvalorização expressiva. Isso abre espaço para uma estratégia de investimento ampliada, com o intuito de maximizar ganhos futuros através de uma abordagem proativa.`,
                `EXPANSÃO ESTRATÉGICA ACONSELHADA: A situação atual de ${sigla} indica uma grande subvalorização. Recomenda-se considerar uma ampliação das posições, com base em um estudo minucioso, visando a aproveitar o potencial de recuperação e ganhos elevados.`,
            ]
        },
        {
            limiteInferior: 0, mensagens: [
                `Muita atenção! Se você acredita que esta criptomoeda possui um grande potencial, este pode ser um bom momento para reavaliar sua posição. Detectou-se uma notável subvalorização da criptomoeda ${sigla}, indicando uma janela de investimento de alto risco com potencial retorno. A recomendação é de considerar aumentar significativamente a exposição a esta cripto, em caso de confiança no projeto, baseando-se em projeções otimistas fundamentadas em análise preditiva. Não deixe de conferir, o esboço de realocações de posições que nossa I.A criou para estes valores ao fim desta análise.`,
                `ALERTA DE INVESTIMENTO: A análise revela que ${sigla} está extremamente subvalorizada. Para os otimistas sobre o futuro desta cripto, agora é a hora de reconsiderar e potencialmente aumentar o investimento. Este movimento, embora arriscado, pode trazer retornos significativos, baseado em análises preditivas avançadas. As estratégias de realocação sugeridas estarão disponíveis ao final desta análise.`,
                `CONSIDERAÇÃO DE ALTO POTENCIAL: A subvalorização de ${sigla} é evidente, apresentando uma oportunidade para os que têm fé no seu potencial. Um aumento na participação pode ser prudente, considerando-se a possibilidade de um retorno substancial. Aguarde as recomendações finais de nossa I.A para ajustes no investimento.`,
                `OPORTUNIDADE DE ALTA RECOMPENSA: Se confia no valor futuro de ${sigla}, a hora de agir pode ser agora, dada sua notável subvalorização. Aumentar a exposição pode ser uma jogada estratégica, mirando em ganhos a longo prazo com base em previsões otimistas. Detalhes sobre possíveis realocações serão providenciados no fim desta análise.`,
                `JANELA DE OPORTUNIDADE: ${sigla} mostra-se significativamente subvalorizada, sinalizando uma ocasião para os que acreditam em seu crescimento. Considerar um aumento na alocação de recursos a este ativo pode ser sábio, visando capturar retornos futuros promissores. Recomendações de realocação por nossa I.A serão detalhadas após a conclusão desta análise.`,
            ]
        },
    ];

    const faixa_selecionada = faixas_rsi.find(faixa => rsi >= faixa.limiteInferior);
    const mensagens_da_faixa = faixa_selecionada.mensagens;

    // Escolher aleatoriamente uma mensagem da lista
    const mensagem_escolhida = mensagens_da_faixa[Math.floor(Math.random() * mensagens_da_faixa.length)];

    return `${mensagem_escolhida}`;
};

const rebalancear_investimentos = (criptos, tipo_rsi) => {
    // Extrair os valores de RSI e investimentos de acordo com o tipo de RSI selecionado
    const rsi_valores = criptos.map(cripto => cripto[tipo_rsi]);
    const investimentos = criptos.map(cripto => cripto.valor_investido);

    // Calcular a inversão dos valores do RSI
    const valor_fixo = Math.max(...rsi_valores) + 1;
    const rsi_invertido = rsi_valores.map(x => valor_fixo - x);

    // Calcular as proporções para cada investimento
    const total_invertido = rsi_invertido.reduce((acc, curr) => acc + curr, 0);
    const proporcoes = rsi_invertido.map(x => x / total_invertido);

    // Calcular o novo valor de alocação para cada investimento
    const total_investido = investimentos.reduce((acc, curr) => acc + curr, 0);
    const novas_alocacoes = proporcoes.map(p => p * total_investido);

    // Retornar os novos valores de alocação junto com as siglas
    return criptos.map((cripto, index) => ({
        ...cripto,
        ["analise_" + tipo_rsi]: {
            valor_rebalanceado: parseFloat(novas_alocacoes[index].toFixed(2)),
            mensagem_analise: gerar_mensagem_rsi(cripto[tipo_rsi], cripto.sigla)
        },
    }));
};

module.exports = {
    pegar_critpos_coingecko,
    calcular_rsi_cripto,
    rebalancear_investimentos
};