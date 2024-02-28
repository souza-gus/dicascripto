const express = require("express");
const router = express.Router();
const { models } = require("../banco/sinc_db");
const { Op } = require('sequelize');
const { enviar_mensagem_whatsapp } = require("../functions/apps_midias_sociais/whatsapp");
const { get_criptos_coingecko_cache } = require("../caches/analise_carteira");
const { calcular_rsi_cripto, rebalancear_investimentos } = require("../functions/analise_carteira");

router.get("/pegar_critpos_coingecko", async (request, response) => {
    try {
        /**
        * Endpoint para trazer todas as criptomedas do CoinGecko
        */

        const criptos = await get_criptos_coingecko_cache();

        response.status(200).json({
            "mensagem": "OK",
            "response": criptos
        });

    } catch (error) {

        response.status(500).json({ "erro": error.message });
    };
});

router.post("/enviar_codigo_confirmacao", async (request, response) => {
    try {
        /**
        * Endpoint para enviar código de confirmação da analise cripto
        */

        const zapi = await enviar_mensagem_whatsapp(request.body.destinatario, request.body.mensagem.replace(/\D/g, ''));

        response.status(200).json({
            "mensagem": "OK",
            "response": zapi
        });

    } catch (error) {
        response.status(500).json({
            "mensagem": "Não foi possível enviar o código de verificação. Aguarde alguns instantes e tente novamente.",
            "erro": error.message
        });
    };
});

router.post("/analisar_carteira", async (request, response) => {
    try {
        /**
        * Endpoint para analisar a carteira de critpomoedas
        * @param {
        *   celular: "",
        *   nome: "",
        *   codigo_gerado: "",
        *   created_by: ""
        *   criptos_carteira: [{
        *       id: "",
        *       symbol: "",
        *       name: "",
        *       image: "",
        *       current_price: 50000,
        *       valor_investido: 234.00
        *   }]
        * } request.body
        */

        // const json = {
        //     "mensagem": "OK",
        //     "response": [
        //         {
        //             "tipo_analise": "Análise Realizada de Curto Prazo",
        //             "analises": [
        //                 {
        //                     "sigla": "BTC",
        //                     "nome_cripto": "Bitcoin",
        //                     "valor_investido": 5000,
        //                     "valor_rebalanceado": 528.4,
        //                     "mensagem_analise": "Hmmm. Interesante.. Nossa I.A observou que a criptomoeda BTC se mantém em uma posição de equilíbrio. Uma possível idéia, seria a realização de ajustes finos nas alocações, visando capturar potenciais de valorizações futuras, conforme indicado por análise de tendências de mercado avaliadas. Nossa I.A também esboçou uma possibilidade de realocação destes valores ao final desta análise."
        //                 },
        //                 {
        //                     "sigla": "ETH",
        //                     "nome_cripto": "Ethereum",
        //                     "valor_investido": 2000,
        //                     "valor_rebalanceado": 5284.02,
        //                     "mensagem_analise": "POTENCIAL DE CRESCIMENTO: De acordo com nossa análise, ETH apresenta sinais de uma oportunidade emergente para reforçar o investimento. Análises de mercado e indicadores sociais fundamentam essa perspectiva, antecipando possíveis ganhos. Recomendações de realocação serão detalhadas ao final deste relatório."
        //                 },
        //                 {
        //                     "sigla": "XRP",
        //                     "nome_cripto": "XRP",
        //                     "valor_investido": 1000,
        //                     "valor_rebalanceado": 2187.58,
        //                     "mensagem_analise": "PONTO DE EQUILÍBRIO: XRP mantém-se estável, aponta a análise de nossa I.A. Considerações para pequenos ajustes nas alocações podem ser sábias para capturar crescimentos futuros. Detalhes sobre como realocar investimentos serão apresentados ao final desta análise."
        //                 }
        //             ]
        //         },
        //         {
        //             "tipo_analise": "Análise Realizada de Médio Prazo",
        //             "analises": [
        //                 {
        //                     "sigla": "BTC",
        //                     "nome_cripto": "Bitcoin",
        //                     "valor_investido": 5000,
        //                     "valor_rebalanceado": 233.24,
        //                     "mensagem_analise": "ALERTA MÁXIMO! A avaliação feita pela nossa I.A destaca a criptomoeda ${sigla} num nível de valorização surpreendente. A partir de uma ampla gama de dados, incluindo análises de mercado, menções sociais e sentimentos, identificamos um forte potencial para a realização de lucros e ajustes estratégicos nas alocações atuais. Esta pode ser uma chance de diversificar o portfólio com ativos de alto crescimento. Fique atento às recomendações de rebalanceamento ao concluir esta análise."
        //                 },
        //                 {
        //                     "sigla": "ETH",
        //                     "nome_cripto": "Ethereum",
        //                     "valor_investido": 2000,
        //                     "valor_rebalanceado": 3120.7,
        //                     "mensagem_analise": "PRESTE ATENÇÃO! De acordo com a nossa análise de I.A, a criptomoeda ETH está em uma trajetória de crescimento estável. Agora pode ser o momento ideal para reavaliar e ajustar as posições de investimento atuais, com o objetivo de capturar ganhos e realocar para ativos com maior potencial. As recomendações para ajustes na carteira serão disponibilizadas ao concluir esta análise."
        //                 },
        //                 {
        //                     "sigla": "XRP",
        //                     "nome_cripto": "XRP",
        //                     "valor_investido": 1000,
        //                     "valor_rebalanceado": 4646.06,
        //                     "mensagem_analise": "Hmmm. Interesante.. Nossa I.A observou que a criptomoeda XRP se mantém em uma posição de equilíbrio. Uma possível idéia, seria a realização de ajustes finos nas alocações, visando capturar potenciais de valorizações futuras, conforme indicado por análise de tendências de mercado avaliadas. Nossa I.A também esboçou uma possibilidade de realocação destes valores ao final desta análise."
        //                 }
        //             ]
        //         },
        //         {
        //             "tipo_analise": "Análise Realizada de Longo Prazo",
        //             "analises": [
        //                 {
        //                     "sigla": "BTC",
        //                     "nome_cripto": "Bitcoin",
        //                     "valor_investido": 5000,
        //                     "valor_rebalanceado": 314.47,
        //                     "mensagem_analise": "ALERTA MÁXIMO! A avaliação feita pela nossa I.A destaca a criptomoeda ${sigla} num nível de valorização surpreendente. A partir de uma ampla gama de dados, incluindo análises de mercado, menções sociais e sentimentos, identificamos um forte potencial para a realização de lucros e ajustes estratégicos nas alocações atuais. Esta pode ser uma chance de diversificar o portfólio com ativos de alto crescimento. Fique atento às recomendações de rebalanceamento ao concluir esta análise."
        //                 },
        //                 {
        //                     "sigla": "ETH",
        //                     "nome_cripto": "Ethereum",
        //                     "valor_investido": 2000,
        //                     "valor_rebalanceado": 364.78,
        //                     "mensagem_analise": "VIGILÂNCIA ELEVADA! Segundo nossa análise de inteligência artificial, a criptomoeda ${sigla} está num patamar de alta significativa. Com base em um leque de informações, incluindo indicadores técnicos e menções online, percebemos uma oportunidade ímpar de capitalizar lucros e reavaliar as posições correntes. Este cenário abre portas para enriquecer o portfólio com opções de maior potencial de valorização. As propostas de realocação da nossa I.A serão apresentadas ao término desta análise."
        //                 },
        //                 {
        //                     "sigla": "XRP",
        //                     "nome_cripto": "XRP",
        //                     "valor_investido": 1000,
        //                     "valor_rebalanceado": 7320.75,
        //                     "mensagem_analise": "OBSERVAÇÃO: A criptomoeda XRP mostra-se equilibrada, revela nossa inteligência artificial. Refinamentos nas alocações atuais podem desbloquear valorizações futuras, de acordo com análises de tendência. Aguarde as propostas de nossa I.A para realocações ao término desta análise."
        //                 }
        //             ]
        //         }
        //     ]
        // };
        // response.status(200).json(json);
        // return;

        // Pegar informações do body
        const criptos_carteira = typeof request.body.criptos_carteira === "string" ? JSON.parse(request.body.criptos_carteira) : request.body.criptos_carteira;
        const { nome: nome_cliente, celular, codigo_gerado, created_by } = request.body;
        const ip_client = request.ip.startsWith("::ffff:") ? request.ip.slice(7) : request.ip;

        const ultima_analise = await models.analises_carteiras.findOne({
            order: [["created_at", "DESC"]],
            where: { [Op.or]: [{ ip_client }, { celular }] }
        });

        var diferenca_em_horas = (new Date() - new Date(ultima_analise.created_at)) / (1000 * 60 * 60);
        var diferenca_em_milissegundos = new Date() - new Date(ultima_analise.created_at);

        if (diferenca_em_horas <= 0.1) {
            const minutos_restantes = Math.floor((diferenca_em_milissegundos % (1000 * 60 * 60)) / (1000 * 60));
            const horas_restantes = Math.floor(diferenca_em_horas);

            const horas_str = horas_restantes === 1 ? "hora" : "horas";
            const minutos_str = minutos_restantes === 1 ? "minuto" : "minutos";

            const mensagem = `Limite de análises atingido. Seu limite será resetado em ${horas_restantes} ${horas_str} e ${minutos_restantes} ${minutos_str}.`;

            const limite_analise_error = new Error(mensagem);
            limite_analise_error.custom_error = true;
            throw limite_analise_error;
        };

        // Adiciona carteira da analise no banco
        const analise_carteira = await models.analises_carteiras.create({ nome_cliente, celular, codigo_gerado, created_by, ip_client });

        // Adiciona criptos da analise no banco
        const analises_carteira_criptos = await models.analises_carteiras_criptos.bulkCreate(criptos_carteira.map(cripto => {
            return {
                id_analise_carteira: analise_carteira.id,
                id_coingecko_cripto: cripto.id,
                sigla_coingecko_cripto: cripto.symbol,
                valor_investido: cripto.valor_investido,
                cotacao_cripto_momento: cripto.current_price,
                created_by
            };
        }));

        // Constroi um novo objeto com o retorno do create no banco
        const analises_objeto = await Promise.all(analises_carteira_criptos.map(async (data, index) => {
            return {
                id: data.id,
                sigla: data.sigla_coingecko_cripto.toUpperCase(),
                nome_cripto: criptos_carteira[index]["name"],
                valor_investido: data.valor_investido
            };
        }));

        // Pega o RSI de cada cripto
        const analises_rsi = await Promise.all(analises_objeto.map(async data => {
            try {
                const rsi_curto_prazo = Math.ceil(await calcular_rsi_cripto(data.sigla, "5m") * 100) / 100;
                const rsi_medio_prazo = Math.ceil(await calcular_rsi_cripto(data.sigla, "4h") * 100) / 100;
                const rsi_longo_prazo = Math.ceil(await calcular_rsi_cripto(data.sigla, "1d") * 100) / 100;

                return {
                    ...data,
                    rsi_curto_prazo,
                    rsi_medio_prazo,
                    rsi_longo_prazo,
                    erro: false
                };

            } catch (error) {
                return {
                    ...data,
                    erro: true
                };
            };
        }));

        // Filtra as analises sem erros e com erros
        const rsi_criptos = analises_rsi.filter(data => !data.erro);
        const rsi_criptos_erros = analises_rsi.filter(data => data.erro);

        // Faz o rebalanceamneto do investimento com base no RSI das critpos
        const analises_rsi_criptos = await rebalancear_investimentos(rebalancear_investimentos(rebalancear_investimentos(rsi_criptos, 'rsi_curto_prazo'), 'rsi_medio_prazo'), 'rsi_longo_prazo');

        // Atualiza as analises no banco de dados com os resultados
        analises_rsi_criptos.forEach(analise => {
            try {
                models.analises_carteiras_criptos.update({
                    valor_rebalanceado_curto_prazo: analise.analise_rsi_curto_prazo.valor_rebalanceado,
                    valor_rebalanceado_medio_prazo: analise.analise_rsi_medio_prazo.valor_rebalanceado,
                    valor_rebalanceado_longo_prazo: analise.analise_rsi_longo_prazo.valor_rebalanceado,

                    resultado_curto_prazo: analise.analise_rsi_curto_prazo.mensagem_analise,
                    resultado_medio_prazo: analise.analise_rsi_medio_prazo.mensagem_analise,
                    resultado_longo_prazo: analise.analise_rsi_longo_prazo.mensagem_analise,

                    rsi_curto_prazo: analise.rsi_curto_prazo,
                    rsi_medio_prazo: analise.rsi_medio_prazo,
                    rsi_longo_prazo: analise.rsi_longo_prazo,
                }, { where: { id: analise.id } });
            } catch (error) {
                console.error("\x1b[91m%s\x1b[0m", error);
            };
        });

        var analise_mensagem_whatsapp = "";
        var rebalanceamentos_mensagem_whatsapp = "🚀 [b]Atualização do Portfólio Cripto[/b]\n\n";
        const analise_curto_prazo = [];
        const analise_medio_prazo = [];
        const analise_longo_prazo = [];

        analises_rsi_criptos.forEach(analise => {

            analise_curto_prazo.push({
                sigla: analise.sigla,
                nome_cripto: analise.nome_cripto,
                valor_investido: analise.valor_investido,
                valor_rebalanceado: analise.analise_rsi_curto_prazo.valor_rebalanceado,
                mensagem_analise: analise.analise_rsi_curto_prazo.mensagem_analise
            });

            analise_medio_prazo.push({
                sigla: analise.sigla,
                nome_cripto: analise.nome_cripto,
                valor_investido: analise.valor_investido,
                valor_rebalanceado: analise.analise_rsi_medio_prazo.valor_rebalanceado,
                mensagem_analise: analise.analise_rsi_medio_prazo.mensagem_analise
            });

            analise_longo_prazo.push({
                sigla: analise.sigla,
                nome_cripto: analise.nome_cripto,
                valor_investido: analise.valor_investido,
                valor_rebalanceado: analise.analise_rsi_longo_prazo.valor_rebalanceado,
                mensagem_analise: analise.analise_rsi_longo_prazo.mensagem_analise
            });
        });

        const response_analises = [
            { tipo_analise: "Análise Realizada de Curto Prazo", tipo_rebalanceamento: "Rebalanceamento de Curto Prazo", analises: analise_curto_prazo },
            { tipo_analise: "Análise Realizada de Médio Prazo", tipo_rebalanceamento: "Rebalanceamento de Médio Prazo", analises: analise_medio_prazo },
            { tipo_analise: "Análise Realizada de Longo Prazo", tipo_rebalanceamento: "Rebalanceamento de Longo Prazo", analises: analise_longo_prazo }
        ];

        response_analises.forEach(analise => {

            analise_mensagem_whatsapp += `[b]${analise.tipo_analise}[/b]\n`;
            rebalanceamentos_mensagem_whatsapp += `📊 [b]${analise.tipo_rebalanceamento}[/b]\n`;

            analise.analises.forEach(a => {
                analise_mensagem_whatsapp += `\n${a.mensagem_analise}\n`;
                rebalanceamentos_mensagem_whatsapp += `\nAtivo: ${a.sigla}\nInvestimento Inicial: R$ ${a.valor_investido}\nRebalanceado para: R$ ${a.valor_rebalanceado}\n`;
            });

            analise_mensagem_whatsapp += "\n\n";
            rebalanceamentos_mensagem_whatsapp += "\n\n";

        });

        analise_mensagem_whatsapp += "[b]Estas sugestões de ajustes não constitui uma recomendação direta de investimento.[/b]"
        rebalanceamentos_mensagem_whatsapp += "[b]Estas sugestões de ajustes não constitui uma recomendação direta de investimento.[/b]"

        var rodape = `🔍 [b]Análise de Mercado DicasCripto[/b] 🔍

A análise acima, foi gerada automaticamente por nossa plataforma de inteligência artificial, dedicada a fornecer insights valiosos sobre o mercado de criptomoedas.
        
Não deixe de acessar nossa comunidade 100% gratuita, onde eu e toda a equipe do Dicas Cripto trabalhamos para trazer diversas informações que podem te ajudar a ter sucesso dentro do mercado cripto.

Já ajudamos milhares de investidores a faturarem milhões de dólares com nossos sinais, gemas, airdrops e identificando criptomoedas com oportunidades de extrema valorização.
        
Além disso, enviamos lá também, notícias e sinais diários que podem te ajudar a operar e aumentar suas chances de lucrar com este mercado todos os dias.
                
Para mais informações e atualizações, acesse nossa comunidade, siga-nos nas redes sociais e fique por dentro das últimas tendências e análises do mercado de criptoativos.
        
        
🧠 [b]Comunidade Dicas Cripto [FREE]:[/b] https://chat.whatsapp.com/KOMIxcf5hl4F0k6vclI0Kr  
🌐 [b]Website:[/b] https://dicascripto.com
📱 [b]Instagram:[/b] https://www.instagram.com/dicascripto
📱 [b]TikTok:[/b] https://tiktok.com/@dicascripto
🎥 [b]YouTube:[/b] https://www.youtube.com/@dicascriptobr`;

        (async () => {
            await enviar_mensagem_whatsapp(celular.replace(/[^0-9]/g, ''), rebalanceamentos_mensagem_whatsapp);
            await enviar_mensagem_whatsapp(celular.replace(/[^0-9]/g, ''), analise_mensagem_whatsapp);
            await enviar_mensagem_whatsapp(
                celular.replace(/[^0-9]/g, ''),
                rodape,
                "https://media-gru1-1.cdn.whatsapp.net/v/t61.24694-24/420091040_305039789219459_3588794033644801185_n.jpg?ccb=11-4&oh=01_AdQrIwlP5MQc3CQOx9c6QlEZeo3Wf7T8FzfovKvZkir1Yw&oe=65E9F056&_nc_sid=e6ed6c&_nc_cat=109",
                "Link",
                "https://chat.whatsapp.com/KOMIxcf5hl4F0k6vclI0Kr",
                "✅ [FREE] | Comunidade Dicas Cripto 🧠",
                'Grupo na comunidade "Comunidade Dicas Cripto | Bitcoin e criptomoedas de um jeito simples!"'
            );
        })();

        response.status(200).json({
            "mensagem": "OK",
            "response": response_analises
        });

    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", error);

        if (error.customError) {
            response.status(400).json({
                "mensagem": error.message,
                "erro": error.message
            });
        } else {
            response.status(500).json({
                "mensagem": "Desculpe, ocorreu um erro interno no servidor. \nNossos técnicos foram notificados e estão trabalhando para resolver o problema. Por favor, tente novamente.",
                "erro": error.message
            });
        };
    };
});

module.exports = router;