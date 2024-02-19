const ftp = require("basic-ftp");
const { Readable } = require('stream');
require("dotenv").config();

const ftp_upload_arquivo = async (buffer_arquivo, caminho_arquivo) => {
    const client = new ftp.Client();
    // client.ftp.verbose = true; // Ative isso para logs detalhados

    try {

        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            port: process.env.FTP_PORT,
            password: process.env.FTP_PASSWORD,
            secure: process.env.FTP_SECURE, // Mude para true se o seu servidor suportar FTPS
        });

        await client.uploadFrom(Readable.from(buffer_arquivo), caminho_arquivo);

        // console.log("Arquivo enviado com sucesso!");
    } catch (error) {
        console.error("\x1b[91m%s\x1b[0m", "Erro ao enviar arquivo: " + error);
    } finally {
        client.close();
    };

};

module.exports = {
    ftp_upload_arquivo
};