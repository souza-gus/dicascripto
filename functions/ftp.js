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

const ftp_url_arquivo = async (arquivo) => {
    const nome_arquivo = `${new Date().getTime()}-${arquivo.originalname.replace(/\s+/g, '-')}`;
    const url_ftp = process.env.FTP_URL;
    const url_ftp_mensagens = process.env.FTP_UPLOADS_MENSAGENS;
    const url_completa = `${url_ftp}/${url_ftp_mensagens}/${nome_arquivo}`;

    await ftp_upload_arquivo(arquivo.buffer, `${url_ftp_mensagens}/${nome_arquivo}`);

    return url_completa;
};

module.exports = {
    ftp_upload_arquivo,
    ftp_url_arquivo
};