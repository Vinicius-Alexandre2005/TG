const express = require("express");
const router = express.Router();
const solicitacaoController = require("../controllers/solicitacao_controller");
const authMiddleware = require("../middleware/auth_middleware");

// Rotas para solicitações de serviço
router.post("/requisitar", authMiddleware, solicitacaoController.requisitarServico);
router.post("/responder", authMiddleware, solicitacaoController.responderSolicitacao);
router.post("/finalizar", authMiddleware, solicitacaoController.finalizarServico);
router.post("/avaliar", authMiddleware, solicitacaoController.avaliarServico);
router.get("/", authMiddleware, solicitacaoController.getSolicitacoes);
router.get("/minhas-solicitacoes", authMiddleware, solicitacaoController.getSolicitacoes);
router.put("/:id/cancelar", authMiddleware, solicitacaoController.cancelarSolicitacao);

// Rotas para notificações
router.get("/notificacoes", authMiddleware, solicitacaoController.getNotificacoes);
router.put("/notificacoes/:id/lida", authMiddleware, solicitacaoController.marcarNotificacaoComoLida);

// Rota para média de avaliações de profissional
router.get("/avaliacoes/profissional/:profissional_id", solicitacaoController.getMediaAvaliacoesProfissional);

module.exports = router;
