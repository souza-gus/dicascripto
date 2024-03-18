function calcular_diferenca_data(from, to) {
    // Calcular a diferença em milissegundos
    var diferenca_ms = to.getTime() - from.getTime();

    // Converter milissegundos para segundos, minutos, horas e dias
    var segundos = Math.floor((diferenca_ms / 1000) % 60);
    var minutos = Math.floor((diferenca_ms / (1000 * 60)) % 60);
    var horas = Math.floor((diferenca_ms / (1000 * 60 * 60)) % 24);
    var dias = Math.floor(diferenca_ms / (1000 * 60 * 60 * 24));

    // Calcular o total de horas, incluindo as horas dos dias
    var total_horas = (dias * 24) + horas;

    // Formatar a saída para "Xh Ymin Zseg"
    var resultado = total_horas + "h " + minutos + "min " + segundos + "seg";
    return resultado;
};

// Função para verificar parâmetros obrigatórios em um objeto
const verificar_parametros = (objeto, parametros) => {
    const erros = parametros.filter(param => objeto[param] === undefined);
  
    if (erros.length) {
      return {
        valido: false,
        mensagem: "Parâmetros obrigatórios faltando: " + erros.join(", ")
      };
    }
  
    return { valido: true };
  };

module.exports = {
    calcular_diferenca_data,
    verificar_parametros
};