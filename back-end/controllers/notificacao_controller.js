const db = require("../config/db");

exports.getNotificacoesByUsuarioId = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    const [notificacoes] = await db.query(
      `SELECT * FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC`,
      [usuarioId]
    );
    res.json(notificacoes);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};

exports.marcarComoLida = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE notificacoes SET lida = TRUE WHERE id = ?`, [id]);
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};

exports.marcarTodasComoLidas = async (req, res) => {
  try {
    const usuarioId = req.user.id;
    await db.query(`UPDATE notificacoes SET lida = TRUE WHERE usuario_id = ?`, [usuarioId]);
    res.status(204).end();
  } catch (error) {
    console.error("Erro ao marcar todas as notificações como lidas:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};
