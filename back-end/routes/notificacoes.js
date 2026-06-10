const express = require("express");
const router = express.Router();
const notificacaoController = require("../controllers/notificacao_controller");
const auth = require("../middleware/auth_middleware");

// Rota para obter todas as notificações de um usuário
router.get("/", auth, notificacaoController.getNotificacoesByUsuarioId);

// Rota para marcar uma notificação como lida
router.put("/:id/lida", auth, notificacaoController.marcarComoLida);

// Rota para marcar todas as notificações de um usuário como lidas
router.put("/marcar-todas-lidas", auth, notificacaoController.marcarTodasComoLidas);

module.exports = router;
