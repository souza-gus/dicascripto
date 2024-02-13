const express = require("express");
const body_parser = require("body-parser");
const rotas = require("./rotas/index");
const path = require("path");
const { inicializa_monitoramento_sinais } = require("./functions/sinais");

const app = express();

app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: true }));
app.use("/", rotas);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json());

// inicializa_monitoramento_sinais();

app.listen(3000, () => {
    console.log(`Servidor está rodando em http://localhost:${3000}`);
});
