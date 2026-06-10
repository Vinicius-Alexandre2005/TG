const db = require("../config/db");
const { withTransaction } = require("../utils/db_utils");

// Função auxiliar para criar uma notificação
async function criarNotificacao(connection, usuarioId, mensagem) {
  await connection.query(
    `INSERT INTO notificacoes (usuario_id, mensagem) VALUES (?, ?)`,
    [usuarioId, mensagem]
  );
}

// Cliente requisita um serviço
exports.requisitarServico = async (req, res) => {
  const { profissional_id } = req.body;
  const cliente_id = req.user.id; // Assumindo que o ID do cliente está no token JWT

  if (!profissional_id) {
    return res.status(400).json({ erro: "ID do profissional é obrigatório." });
  }

  try {
    await withTransaction(async (connection) => {
      // Verificar se o cliente existe
      const [cliente] = await connection.query(
        `SELECT id FROM clientes WHERE usuario_id = ?`,
        [cliente_id]
      );

      if (cliente.length === 0) {
        throw { status: 404, message: "Cliente não encontrado." };
      }

      // Verificar se o profissional existe
      const [profissional] = await connection.query(
        `SELECT id, usuario_id FROM profissionais WHERE id = ?`,
        [profissional_id]
      );

      if (profissional.length === 0) {
        throw { status: 404, message: "Profissional não encontrado." };
      }

      const profissionalUsuarioId = profissional[0].usuario_id;

      // Criar a solicitação de serviço
      const [result] = await connection.query(
        `INSERT INTO solicitacoes_servico (cliente_id, profissional_id, status) VALUES (?, ?, 'PENDENTE')`,
        [cliente[0].id, profissional_id]
      );

      // Notificar o profissional
      const [clienteUsuario] = await connection.query(
        `SELECT nome_completo FROM usuarios WHERE id = ?`,
        [cliente_id]
      );
      const clienteNome = clienteUsuario[0].nome_completo;

      await criarNotificacao(
        connection,
        profissionalUsuarioId,
        `${clienteNome} requisitou um serviço.`
      );

      res.status(201).json({ mensagem: "Solicitação de serviço enviada com sucesso!", solicitacaoId: result.insertId });
    });
  } catch (error) {
    console.error("Erro ao requisitar serviço:", error);
    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Profissional aceita ou recusa um serviço
exports.responderSolicitacao = async (req, res) => {
  const { solicitacao_id, acao } = req.body;
  const profissional_usuario_id = req.user.id; // Assumindo que o ID do usuário profissional está no token JWT

  if (!solicitacao_id || !acao || !['aceitar', 'recusar'].includes(acao)) {
    return res.status(400).json({ erro: "ID da solicitação e ação (aceitar/recusar) são obrigatórios." });
  }

  try {
    await withTransaction(async (connection) => {
      const [solicitacao] = await connection.query(
        `SELECT ss.id, ss.status, c.usuario_id as cliente_usuario_id, p.usuario_id as profissional_usuario_id
         FROM solicitacoes_servico ss
         JOIN clientes c ON c.id = ss.cliente_id
         JOIN profissionais p ON p.id = ss.profissional_id
         WHERE ss.id = ?`,
        [solicitacao_id]
      );

      if (solicitacao.length === 0) {
        throw { status: 404, message: "Solicitação de serviço não encontrada." };
      }

      const { status, cliente_usuario_id, profissional_usuario_id } = solicitacao[0];

      // Verificar se o profissional logado é o profissional da solicitação
      if (profissional_usuario_id !== req.user.id) {
        throw { status: 403, message: "Você não tem permissão para responder a esta solicitação." };
      }

      if (status !== 'PENDENTE') {
        throw { status: 400, message: "A solicitação já foi respondida." };
      }

      let novoStatus;
      let mensagemCliente;
      let dataAtualizacao = new Date();

      if (acao === 'aceitar') {
        novoStatus = 'EM_ANDAMENTO';
        mensagemCliente = "Seu serviço foi aceito.";
        await connection.query(
          `UPDATE solicitacoes_servico SET status = ?, data_aceite = ? WHERE id = ?`,
          [novoStatus, dataAtualizacao, solicitacao_id]
        );
      } else {
        novoStatus = 'RECUSADO';
        mensagemCliente = "Seu serviço foi recusado.";
        await connection.query(
          `UPDATE solicitacoes_servico SET status = ? WHERE id = ?`,
          [novoStatus, solicitacao_id]
        );
      }

      // Notificar o cliente
      await criarNotificacao(connection, cliente_usuario_id, mensagemCliente);

      res.json({ mensagem: `Solicitação ${acao === 'aceitar' ? 'aceita' : 'recusada'} com sucesso!`, novoStatus });
    });
  } catch (error) {
    console.error("Erro ao responder solicitação:", error);
    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Profissional finaliza um serviço
exports.finalizarServico = async (req, res) => {
  const { solicitacao_id } = req.body;
  const profissional_usuario_id = req.user.id; // Assumindo que o ID do usuário profissional está no token JWT

  if (!solicitacao_id) {
    return res.status(400).json({ erro: "ID da solicitação é obrigatório." });
  }

  try {
    await withTransaction(async (connection) => {
      const [solicitacao] = await connection.query(
        `SELECT ss.id, ss.status, c.usuario_id as cliente_usuario_id, p.usuario_id as profissional_usuario_id
         FROM solicitacoes_servico ss
         JOIN clientes c ON c.id = ss.cliente_id
         JOIN profissionais p ON p.id = ss.profissional_id
         WHERE ss.id = ?`,
        [solicitacao_id]
      );

      if (solicitacao.length === 0) {
        throw { status: 404, message: "Solicitação de serviço não encontrada." };
      }

      const { status, cliente_usuario_id, profissional_usuario_id } = solicitacao[0];

      // Verificar se o profissional logado é o profissional da solicitação
      if (profissional_usuario_id !== req.user.id) {
        throw { status: 403, message: "Você não tem permissão para finalizar esta solicitação." };
      }

      if (status !== 'EM_ANDAMENTO') {
        throw { status: 400, message: "O serviço não está em andamento para ser finalizado." };
      }

      const novoStatus = 'FINALIZADO';
      const dataAtualizacao = new Date();

      await connection.query(
        `UPDATE solicitacoes_servico SET status = ?, data_finalizacao = ? WHERE id = ?`,
        [novoStatus, dataAtualizacao, solicitacao_id]
      );

      // Notificar o cliente
      await criarNotificacao(
        connection,
        cliente_usuario_id,
        "Seu serviço foi finalizado. Avalie o profissional."
      );

      res.json({ mensagem: "Serviço finalizado com sucesso!", novoStatus });
    });
  } catch (error) {
    console.error("Erro ao finalizar serviço:", error);
    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Cliente avalia um serviço finalizado
exports.avaliarServico = async (req, res) => {
  const { solicitacao_id, nota, comentario } = req.body;
  const cliente_usuario_id = req.user.id;

  if (!solicitacao_id || nota === undefined || nota < 0 || nota > 5) {
    return res.status(400).json({ erro: "ID da solicitação e nota (0-5) são obrigatórios." });
  }

  try {
    await withTransaction(async (connection) => {
      const [solicitacao] = await connection.query(
        `SELECT ss.id, ss.status, ss.cliente_id, ss.profissional_id, c.usuario_id as cliente_usuario_id_solicitacao
         FROM solicitacoes_servico ss
         JOIN clientes c ON c.id = ss.cliente_id
         WHERE ss.id = ?`,
        [solicitacao_id]
      );

      if (solicitacao.length === 0) {
        throw { status: 404, message: "Solicitação de serviço não encontrada." };
      }

      const { status, cliente_id, profissional_id, cliente_usuario_id_solicitacao } = solicitacao[0];

      // Verificar se o cliente logado é o cliente da solicitação
      if (cliente_usuario_id_solicitacao !== cliente_usuario_id) {
        throw { status: 403, message: "Você não tem permissão para avaliar esta solicitação." };
      }

      if (status !== 'FINALIZADO') {
        throw { status: 400, message: "Somente serviços finalizados podem ser avaliados." };
      }

      // Verificar se já existe uma avaliação para esta solicitação
      const [avaliacaoExistente] = await connection.query(
        `SELECT id FROM avaliacoes WHERE solicitacao_id = ?`,
        [solicitacao_id]
      );

      if (avaliacaoExistente.length > 0) {
        throw { status: 400, message: "Esta solicitação já foi avaliada." };
      }

      await connection.query(
        `INSERT INTO avaliacoes (solicitacao_id, cliente_id, profissional_id, nota, comentario) VALUES (?, ?, ?, ?, ?)`,
        [solicitacao_id, cliente_id, profissional_id, nota, comentario]
      );

      res.status(201).json({ mensagem: "Serviço avaliado com sucesso!" });
    });
  } catch (error) {
    console.error("Erro ao avaliar serviço:", error);
    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Obter todas as notificações para o usuário logado
exports.getNotificacoes = async (req, res) => {
  const usuario_id = req.user.id;

  try {
    const [notificacoes] = await db.query(
      `SELECT id, mensagem, lida, created_at FROM notificacoes WHERE usuario_id = ? ORDER BY created_at DESC`,
      [usuario_id]
    );

    res.json(notificacoes);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Marcar notificação como lida
exports.marcarNotificacaoComoLida = async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.user.id;

  try {
    const [result] = await db.query(
      `UPDATE notificacoes SET lida = TRUE WHERE id = ? AND usuario_id = ?`,
      [id, usuario_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Notificação não encontrada ou você não tem permissão." });
    }

    res.json({ mensagem: "Notificação marcada como lida." });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Obter solicitações de serviço para o usuário logado (cliente ou profissional)
exports.getSolicitacoes = async (req, res) => {
  const usuario_id = req.user.id;
  const { tipo_usuario } = req.user; // Assumindo que o tipo de usuário está no token JWT

  try {
    let query;
    let params;

    if (tipo_usuario === 'cliente') {
      query = `
        SELECT ss.id, ss.status, ss.created_at, ss.data_aceite, ss.data_finalizacao,
               p.id as profissional_id, u.nome_completo as profissional_nome,
               u.telefone as profissional_telefone, u.email as profissional_email,
               (SELECT nome FROM servicos s JOIN profissional_servicos ps ON s.id = ps.servico_id WHERE ps.profissional_id = p.id LIMIT 1) as servico_nome
        FROM solicitacoes_servico ss
        JOIN clientes c ON c.id = ss.cliente_id
        JOIN profissionais p ON p.id = ss.profissional_id
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE c.usuario_id = ?
        ORDER BY ss.created_at DESC
      `;
      params = [usuario_id];
    } else if (tipo_usuario === 'profissional') {
      query = `
        SELECT ss.id, ss.status, ss.created_at, ss.data_aceite, ss.data_finalizacao,
               c.id as cliente_id, u.nome_completo as cliente_nome,
               u.telefone as cliente_telefone, u.email as cliente_email,
               (SELECT nome FROM servicos s JOIN profissional_servicos ps ON s.id = ps.servico_id WHERE ps.profissional_id = p.id LIMIT 1) as servico_nome
        FROM solicitacoes_servico ss
        JOIN profissionais p ON p.id = ss.profissional_id
        JOIN clientes c ON c.id = ss.cliente_id
        JOIN usuarios u ON u.id = c.usuario_id
        WHERE p.usuario_id = ?
        ORDER BY ss.created_at DESC
      `;
      params = [usuario_id];
    } else {
      return res.status(403).json({ erro: "Tipo de usuário não autorizado para visualizar solicitações." });
    }

    const [solicitacoes] = await db.query(query, params);
    res.json(solicitacoes);
  } catch (error) {
    console.error("Erro ao buscar solicitações:", error);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Cancelar uma solicitação de serviço
exports.cancelarSolicitacao = async (req, res) => {
  const { id } = req.params;
  const usuario_id = req.user.id;

  try {
    await withTransaction(async (connection) => {
      const [solicitacao] = await connection.query(
        `SELECT ss.id, ss.status, ss.cliente_id, ss.profissional_id, c.usuario_id as cliente_usuario_id, p.usuario_id as profissional_usuario_id
         FROM solicitacoes_servico ss
         JOIN clientes c ON c.id = ss.cliente_id
         JOIN profissionais p ON p.id = ss.profissional_id
         WHERE ss.id = ?`,
        [id]
      );

      if (solicitacao.length === 0) {
        throw { status: 404, message: "Solicitação de serviço não encontrada." };
      }

      const { status, cliente_usuario_id, profissional_usuario_id } = solicitacao[0];

      // Verificar se o usuário logado é o cliente ou profissional da solicitação
      if (usuario_id !== cliente_usuario_id && usuario_id !== profissional_usuario_id) {
        throw { status: 403, message: "Você não tem permissão para cancelar esta solicitação." };
      }

      if (status === 'FINALIZADO' || status === 'RECUSADO') {
        throw { status: 400, message: "Não é possível cancelar uma solicitação finalizada ou recusada." };
      }

      await connection.query(
        `UPDATE solicitacoes_servico SET status = ? WHERE id = ?`,
        ['CANCELADO', id]
      );

      // Notificar o outro usuário
      const destinatario = usuario_id === cliente_usuario_id ? profissional_usuario_id : cliente_usuario_id;
      await criarNotificacao(connection, destinatario, "Uma solicitação de serviço foi cancelada.");

      res.json({ mensagem: "Solicitação cancelada com sucesso!" });
    });
  } catch (error) {
    console.error("Erro ao cancelar solicitação:", error);
    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};

// Obter a média de avaliações de um profissional
exports.getMediaAvaliacoesProfissional = async (req, res) => {
  const { profissional_id } = req.params;

  try {
    const [result] = await db.query(
      `SELECT AVG(nota) as media_avaliacoes FROM avaliacoes WHERE profissional_id = ?`,
      [profissional_id]
    );

    const media = result[0].media_avaliacoes || 0;
    res.json({ profissional_id, media_avaliacoes: parseFloat(media).toFixed(1) });
  } catch (error) {
    console.error("Erro ao calcular média de avaliações:", error);
    res.status(500).json({ erro: "Erro interno do servidor." });
  }
};