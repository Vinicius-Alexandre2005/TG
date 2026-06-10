const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { withTransaction } = require("../utils/db_utils");
const { buildUserUpdate, buildAddressUpdate } = require("../utils/update_utils");
const { converterDataParaBanco } = require("../utils/formatadores");

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Email e senha são obrigatórios",
      });
    }

    const [usuarios] = await db.query(
      `SELECT id, email, senha, tipo_usuario FROM usuarios WHERE email = ?`,
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Credenciais inválidas",
      });
    }

    const usuario = usuarios[0];

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Credenciais inválidas",
      });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.status(200).json({
      sucesso: true,
      token,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      sucesso: false,
    });
  }
};

exports.perfil = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT
        u.id,
        u.nome_completo,
        u.email,
        u.telefone,
        DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') AS data_nascimento,
        u.tipo_usuario,
        u.endereco_id,
        e.cep,
        e.rua,
        e.bairro,
        e.cidade,
        e.estado,
        e.numero,
        e.complemento
      FROM usuarios u
      LEFT JOIN enderecos e ON u.endereco_id = e.id
      WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Usuário não encontrado",
      });
    }

    return res.status(200).json({
      sucesso: true,
      usuario: rows[0],
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno do servidor",
    });
  }
};

exports.updatePerfil = async (req, res) => {
  const userId = req.user.id;
  const dados = req.body;

  try {
    await withTransaction(async (connection) => {
      const [usuarios] = await connection.query(
        "SELECT * FROM usuarios WHERE id = ?",
        [userId]
      );

      if (usuarios.length === 0) {
        throw { status: 404, message: "Usuário não encontrado" };
      }

      const usuario = usuarios[0];

      const { fields: userFields, values: userValues } = await buildUserUpdate(dados);

      if (userFields.length > 0) {
        userValues.push(userId);
        await connection.query(
          `UPDATE usuarios SET ${userFields.join(", ")} WHERE id = ?`,
          userValues
        );
      }

      if (usuario.endereco_id) {
        const { fields: addressFields, values: addressValues } = buildAddressUpdate(dados);

        if (addressFields.length > 0) {
          addressValues.push(usuario.endereco_id);
          await connection.query(
            `UPDATE enderecos SET ${addressFields.join(", ")} WHERE id = ?`,
            addressValues
          );
        }
      }
      res.status(200).json({ sucesso: true, mensagem: "Perfil atualizado com sucesso" });
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);

    if (error.status) {
      return res.status(error.status).json({ erro: error.message });
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ erro: "Este e-mail já está cadastrado" });
    }

    return res.status(500).json({ erro: "Erro interno do servidor" });
  }
};