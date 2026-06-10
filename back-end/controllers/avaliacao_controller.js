const db = require("../config/db");

exports.createAvaliacao = async (req, res) => {
  try {
    const { solicitacao_id, profissional_id, cliente_id, nota, comentario } = req.body;

    // Verificar se a solicitação existe e está concluída
    const [solicitacao] = await db.query(
      `SELECT status FROM solicitacoes_servico WHERE id = ? AND cliente_id = ?`,
      [solicitacao_id, cliente_id]
    );

    if (solicitacao.length === 0 || solicitacao[0].status !== 'FINALIZADO') {
      return res.status(400).json({ erro: 'Não é possível avaliar uma solicitação inexistente ou não finalizada.' });
    }

    // Verificar se já existe uma avaliação para esta solicitação
    const [avaliacaoExistente] = await db.query(
      `SELECT id FROM avaliacoes WHERE solicitacao_id = ?`,
      [solicitacao_id]
    );

    if (avaliacaoExistente.length > 0) {
      return res.status(400).json({ erro: 'Esta solicitação já foi avaliada.' });
    }

    const [result] = await db.query(
      `INSERT INTO avaliacoes (solicitacao_id, profissional_id, cliente_id, nota, comentario, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
      [solicitacao_id, profissional_id, cliente_id, nota, comentario]
    );

    res.status(201).json({ mensagem: 'Avaliação criada com sucesso!', id: result.insertId });
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};

exports.getAvaliacoesByProfissionalId = async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const [avaliacoes] = await db.query(
      `SELECT a.*, u.nome_completo AS cliente_nome 
       FROM avaliacoes a 
       JOIN clientes c ON a.cliente_id = c.id
       JOIN usuarios u ON c.usuario_id = u.id 
       WHERE a.profissional_id = ? 
       ORDER BY a.created_at DESC`,
      [profissionalId]
    );
    res.json(avaliacoes);
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};

exports.getMediaAvaliacoesByProfissionalId = async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const [result] = await db.query(
      `SELECT AVG(nota) AS media_avaliacoes FROM avaliacoes WHERE profissional_id = ?`,
      [profissionalId]
    );
    res.json({ media_avaliacoes: result[0].media_avaliacoes || 0 });
  } catch (error) {
    console.error("Erro ao buscar média de avaliações:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};
