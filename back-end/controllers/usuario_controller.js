const db = require('../config/db')
const bcrypt = require('bcrypt')
const { converterDataParaBanco } = require('../utils/formatadores')

function limparCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '')
}

async function vincularServicosPorNome(connection, profissionalId, servicosRecebidos) {
  const servicos = Array.isArray(servicosRecebidos) ? servicosRecebidos : []

  for (const servicoBruto of servicos) {
    const nomeServico = String(servicoBruto || '').trim()
    if (!nomeServico) continue

    const [servicoExistente] = await connection.query(
      'SELECT id FROM servicos WHERE nome = ?',
      [nomeServico]
    )

    let servicoId

    if (servicoExistente.length > 0) {
      servicoId = servicoExistente[0].id
    } else {
      const [novoServico] = await connection.query(
        'INSERT INTO servicos (nome) VALUES (?)',
        [nomeServico]
      )
      servicoId = novoServico.insertId
    }

    await connection.query(
      `INSERT INTO profissional_servicos (profissional_id, servico_id)
       VALUES (?, ?)` ,
      [profissionalId, servicoId]
    )
  }
}

const cadastrarUsuario = async (req, res) => {
  const {
    nome_completo,
    email,
    telefone,
    senha,
    data_nascimento,
    tipo_usuario,
    cpf,
    sobre,
    servicos,
    cep,
    rua,
    bairro,
    cidade,
    estado,
    numero,
    complemento
  } = req.body

  let connection

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    if (!tipo_usuario || !['cliente', 'profissional'].includes(tipo_usuario)) {
      await connection.rollback()
      return res.status(400).json({ erro: 'Tipo de usuário inválido' })
    }

    if (!email || !String(email).trim()) {
      await connection.rollback()
      return res.status(400).json({ erro: 'E-mail é obrigatório' })
    }

    if (!senha || !String(senha).trim()) {
      await connection.rollback()
      return res.status(400).json({ erro: 'Senha é obrigatória' })
    }

    if (tipo_usuario === 'profissional') {
      if (!limparCpf(cpf)) {
        await connection.rollback()
        return res.status(400).json({ erro: 'CPF é obrigatório para profissional' })
      }

      if (!Array.isArray(servicos) || servicos.length === 0) {
        await connection.rollback()
        return res.status(400).json({ erro: 'Informe ao menos um serviço' })
      }
    }

    const dataFormatada = converterDataParaBanco(data_nascimento) || null
    const senhaHash = await bcrypt.hash(String(senha), 10)
    const cpfLimpo = limparCpf(cpf)

    const [enderecoResult] = await connection.query(
      `INSERT INTO enderecos (cep, rua, bairro, cidade, estado, numero, complemento)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cep, rua, bairro, cidade, estado, numero, complemento || null]
    )

    const enderecoId = enderecoResult.insertId

    const [usuarioResult] = await connection.query(
      `INSERT INTO usuarios (
        nome_completo,
        email,
        telefone,
        senha,
        data_nascimento,
        tipo_usuario,
        endereco_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nome_completo, email, telefone, senhaHash, dataFormatada, tipo_usuario, enderecoId]
    )

    const usuarioId = usuarioResult.insertId

    if (tipo_usuario === 'cliente') {
      await connection.query(
        'INSERT INTO clientes (usuario_id) VALUES (?)',
        [usuarioId]
      )
    }

    if (tipo_usuario === 'profissional') {
      const [profissionalResult] = await connection.query(
        'INSERT INTO profissionais (usuario_id, cpf, sobre) VALUES (?, ?, ?)',
        [usuarioId, cpfLimpo, sobre || null]
      )

      await vincularServicosPorNome(connection, profissionalResult.insertId, servicos)
    }

    await connection.commit()
    return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso' })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('Erro ao cadastrar usuário:', error)

    if (error.code === 'ER_DUP_ENTRY') {
      if (String(error.sqlMessage || '').includes('uk_usuarios_email')) {
        return res.status(400).json({ erro: 'Este e-mail já está cadastrado' })
      }

      if (String(error.sqlMessage || '').includes('uk_profissionais_cpf')) {
        return res.status(400).json({ erro: 'Este CPF já está cadastrado' })
      }

      return res.status(400).json({ erro: 'Registro duplicado' })
    }

    return res.status(500).json({ erro: 'Erro interno do servidor' })
  } finally {
    if (connection) connection.release()
  }
}

const listarUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
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
        e.complemento,
        u.created_at
      FROM usuarios u
      LEFT JOIN enderecos e ON u.endereco_id = e.id
      ORDER BY u.id ASC
    `)

    return res.status(200).json(rows)
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

const buscarUsuarioPorId = async (req, res) => {
  const { id } = req.params

  try {
    const [rows] = await db.query(`
      SELECT
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
        e.complemento,
        u.created_at
      FROM usuarios u
      LEFT JOIN enderecos e ON u.endereco_id = e.id
      WHERE u.id = ?
    `, [id])

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' })
    }

    return res.status(200).json(rows[0])
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  }
}

const atualizarUsuario = async (req, res) => {
  const { id } = req.params
  const {
    nome_completo,
    email,
    telefone,
    senha,
    data_nascimento,
    cep,
    rua,
    bairro,
    cidade,
    estado,
    numero,
    complemento
  } = req.body

  let connection

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [usuarios] = await connection.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    )

    if (usuarios.length === 0) {
      await connection.rollback()
      return res.status(404).json({ erro: 'Usuário não encontrado' })
    }

    const usuario = usuarios[0]
    const camposUsuario = []
    const valoresUsuario = []

    if (nome_completo !== undefined) {
      camposUsuario.push('nome_completo = ?')
      valoresUsuario.push(nome_completo)
    }

    if (email !== undefined) {
      camposUsuario.push('email = ?')
      valoresUsuario.push(email)
    }

    if (telefone !== undefined) {
      camposUsuario.push('telefone = ?')
      valoresUsuario.push(telefone)
    }

    if (senha !== undefined && String(senha).trim() !== '') {
      const senhaHash = await bcrypt.hash(String(senha), 10)
      camposUsuario.push('senha = ?')
      valoresUsuario.push(senhaHash)
    }

    if (data_nascimento !== undefined) {
      camposUsuario.push('data_nascimento = ?')
      valoresUsuario.push(converterDataParaBanco(data_nascimento) || data_nascimento || null)
    }

    if (camposUsuario.length > 0) {
      valoresUsuario.push(id)
      await connection.query(
        `UPDATE usuarios SET ${camposUsuario.join(', ')} WHERE id = ?`,
        valoresUsuario
      )
    }

    if (usuario.endereco_id) {
      const camposEndereco = []
      const valoresEndereco = []

      for (const [campo, valor] of Object.entries({ cep, rua, bairro, cidade, estado, numero })) {
        if (valor !== undefined) {
          camposEndereco.push(`${campo} = ?`)
          valoresEndereco.push(valor)
        }
      }

      if (complemento !== undefined) {
        camposEndereco.push('complemento = ?')
        valoresEndereco.push(complemento || null)
      }

      if (camposEndereco.length > 0) {
        valoresEndereco.push(usuario.endereco_id)
        await connection.query(
          `UPDATE enderecos SET ${camposEndereco.join(', ')} WHERE id = ?`,
          valoresEndereco
        )
      }
    }

    await connection.commit()
    return res.status(200).json({ mensagem: 'Usuário atualizado com sucesso' })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('Erro ao atualizar usuário:', error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ erro: 'Este e-mail já está cadastrado' })
    }

    return res.status(500).json({ erro: 'Erro interno do servidor' })
  } finally {
    if (connection) connection.release()
  }
}

const deletarUsuario = async (req, res) => {
  const { id } = req.params
  let connection

  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [usuarios] = await connection.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    )

    if (usuarios.length === 0) {
      await connection.rollback()
      return res.status(404).json({ erro: 'Usuário não encontrado' })
    }

    const usuario = usuarios[0]
    const enderecoId = usuario.endereco_id

    if (usuario.tipo_usuario === 'profissional') {
      const [profissionais] = await connection.query(
        'SELECT id FROM profissionais WHERE usuario_id = ?',
        [id]
      )

      if (profissionais.length > 0) {
        const profissionalId = profissionais[0].id

        await connection.query(
          'DELETE FROM profissional_servicos WHERE profissional_id = ?',
          [profissionalId]
        )

        await connection.query(
          'DELETE FROM profissionais WHERE usuario_id = ?',
          [id]
        )
      }
    }

    if (usuario.tipo_usuario === 'cliente') {
      await connection.query(
        'DELETE FROM clientes WHERE usuario_id = ?',
        [id]
      )
    }

    await connection.query(
      'DELETE FROM usuarios WHERE id = ?',
      [id]
    )

    if (enderecoId) {
      const [enderecoUso] = await connection.query(
        'SELECT COUNT(*) AS total FROM usuarios WHERE endereco_id = ?',
        [enderecoId]
      )

      if (enderecoUso[0].total === 0) {
        await connection.query(
          'DELETE FROM enderecos WHERE id = ?',
          [enderecoId]
        )
      }
    }

    await connection.commit()
    return res.status(200).json({ mensagem: 'Usuário deletado com sucesso' })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('Erro ao deletar usuário:', error)
    return res.status(500).json({ erro: 'Erro interno do servidor' })
  } finally {
    if (connection) connection.release()
  }
}

module.exports = {
  cadastrarUsuario,
  listarUsuarios,
  buscarUsuarioPorId,
  atualizarUsuario,
  deletarUsuario
}
