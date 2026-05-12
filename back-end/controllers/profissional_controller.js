const db = require("../config/db");
const bcrypt = require("bcrypt");
const { converterDataParaBanco } = require("../utils/formatadores");
const { withTransaction } = require("../utils/db_utils");
const { buildUserUpdate, buildAddressUpdate } = require("../utils/update_utils");

async function buscarProfissional(connection, id) {
  const [rows] = await connection.query(
    `SELECT p.id, p.usuario_id, u.endereco_id
     FROM profissionais p
     JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.id = ?`,
    [id]
  );

  return rows[0] || null;
}

async function salvarServicos(connection, profissionalId, servicos = []) {
  await connection.query(`DELETE FROM profissional_servicos WHERE profissional_id = ?`, [profissionalId]);

  for (const nome of servicos) {
    if (!nome?.trim()) continue;

    const [existe] = await connection.query(`SELECT id FROM servicos WHERE nome = ?`, [nome]);

    let id = existe[0]?.id;

    if (!id) {
      const [novo] = await connection.query(`INSERT INTO servicos (nome) VALUES (?)`, [nome]);
      id = novo.insertId;
    }

    await connection.query(
      `INSERT INTO profissional_servicos (profissional_id, servico_id) VALUES (?, ?)`,
      [profissionalId, id]
    );
  }
}

exports.getAll = async (req, res) => {
  try {
    const { busca } = req.query

    const termo = `%${busca || ''}%`

    const [rows] = await db.query(`
      SELECT 
        p.id,
        u.nome_completo,
        u.telefone,
        p.sobre,
        GROUP_CONCAT(s.nome SEPARATOR ', ') AS servicos
      FROM profissionais p
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN profissional_servicos ps 
        ON ps.profissional_id = p.id
      LEFT JOIN servicos s 
        ON s.id = ps.servico_id
      WHERE 
        u.nome_completo LIKE ?
        OR p.sobre LIKE ?
        OR s.nome LIKE ?
      GROUP BY p.id
    `, [termo, termo, termo])

    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      erro: 'Erro ao buscar profissionais'
    })
  }
}

exports.getById = async (req, res) => {
  try {
    const { id } = req.params

    const [rows] = await db.query(
      `
      SELECT
        p.id,
        u.nome_completo,
        u.email,
        u.telefone,
        p.sobre,
        GROUP_CONCAT(s.nome SEPARATOR ', ') AS servicos
      FROM profissionais p
      JOIN usuarios u 
        ON u.id = p.usuario_id

      LEFT JOIN profissional_servicos ps
        ON ps.profissional_id = p.id

      LEFT JOIN servicos s
        ON s.id = ps.servico_id

      WHERE p.id = ?

      GROUP BY p.id
      `,
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({
        erro: 'Profissional não encontrado'
      })
    }

    res.json(rows[0])

  } catch (error) {
    console.error(error)

    res.status(500).json({
      erro: 'Erro ao buscar profissional'
    })
  }
}

exports.put = async (req, res) => {
  const { id } = req.params;
  const dados = req.body;

  try {
    await withTransaction(async (connection) => {
      const profissional = await buscarProfissional(connection, id);
      if (!profissional) {
        throw { status: 404, message: "Profissional não encontrado" };
      }

      const { fields: userFields, values: userValues } = await buildUserUpdate(dados);

      if (userFields.length > 0) {
        userValues.push(profissional.usuario_id);
        await connection.query(
          `UPDATE usuarios SET ${userFields.join(", ")} WHERE id = ?`,
          userValues
        );
      }

      if (profissional.endereco_id) {
        const { fields: addressFields, values: addressValues } = buildAddressUpdate(dados);

        if (addressFields.length > 0) {
          addressValues.push(profissional.endereco_id);
          await connection.query(
            `UPDATE enderecos SET ${addressFields.join(", ")} WHERE id = ?`,
            addressValues
          );
        }
      }

      if (dados.servicos) {
        await salvarServicos(connection, id, dados.servicos);
      }
      res.status(204).end();
    });
  } catch (error) {
    console.error("Erro ao atualizar profissional:", error);
    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
};