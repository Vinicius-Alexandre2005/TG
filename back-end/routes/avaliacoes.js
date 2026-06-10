const express = require("express");
const router = express.Router();
const avaliacaoController = require("../controllers/avaliacao_controller");
const auth = require("../middleware/auth_middleware");

// Rota para criar uma nova avaliação
router.post("/", auth, avaliacaoController.createAvaliacao);

// Rota para obter todas as avaliações de um profissional
router.get("/profissional/:profissionalId", avaliacaoController.getAvaliacoesByProfissionalId);

// Rota para obter a média de avaliações de um profissional
router.get("/profissional/:profissionalId/media", avaliacaoController.getMediaAvaliacoesByProfissionalId);

module.exports = router;
