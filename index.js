const express = require("express");
const body_parser = require("body-parser");
const rotas = require("./rotas/index");
const path = require("path");
const { inicializa_monitoramento_sinais } = require("./functions/sinais/monitoramento_sinais");
const cors = require('cors');
require("dotenv").config();

const app = express();

app.use(cors());
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));
app.use("/", rotas);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json());

inicializa_monitoramento_sinais();

app.listen(process.env.PORTA_SERVIDOR, () => {
    console.log(`Servidor está rodando em http://localhost:${process.env.PORTA_SERVIDOR}`);
});
