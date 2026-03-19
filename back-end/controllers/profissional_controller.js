const db = require('../config/db')
const bcrypt = require('bcrypt')
const { converterDataParaBanco } = require('../utils/formatadores')

function getCamposUsuario(dados) {
  const campos = []
  const valores = []

  for (const campo of ['nome_completo', 'email', 'telefone']) {
    if (campo in dados) {
      campos.push(`${campo} = ?`)
      valores.push(dados[campo])
    }
  }

  return { campos, valores }
}

function getCamposEndereco(dados) {
  const campos = []
  const valores = []

  for (const campo of ['cep', 'rua', 'bairro', 'cidade', 'estado', 'numero']) {
    if (campo in dados) {
      campos.push(`${campo} = ?`)
      valores.push(dados[campo])
    }
  }

  if ('complemento' in dados) {
    campos.push('complemento = ?')
    valores.push(dados.complemento || null)
  }

  return { campos, valores }
}

async function buscarProfissional(connection, id) {
  const [profissionais] = await connection.query(
    `SELECT 
      p.id,
      p.usuario_id,
      p.cpf,
      p.sobre,
      u.endereco_id
     FROM profissionais p
     JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.id = ?`,
    [id]
  )

  return profissionais[0] || null
}

async function salvarServicos(connection, profissionalId, servicos) {
  await connection.query(
    `DELETE FROM profissional_servicos WHERE profissional_id = ?`,
    [profissionalId]
  )

  const servicosNormalizados = Array.isArray(servicos) ? servicos : []

  for (const servicoBruto of servicosNormalizados) {
    const nomeServico = String(servicoBruto || '').trim()
    if (!nomeServico) continue

    const [servicoExistente] = await connection.query(
      `SELECT id FROM servicos WHERE nome = ?`,
      [nomeServico]
    )

    let servicoId

    if (servicoExistente.length > 0) {
      servicoId = servicoExistente[0].id
    } else {
      const [servicoResult] = await connection.query(
        `INSERT INTO servicos (nome) VALUES (?)`,
        [nomeServico]
      )
      servicoId = servicoResult.insertId
    }

    await connection.query(
      `INSERT INTO profissional_servicos (profissional_id, servico_id)
       VALUES (?, ?)`,
      [profissionalId, servicoId]
    )
  }
}

exports.getAll = async (req, res) => {
  try {
    const [profissionais] = await db.query(
      `SELECT 
        p.id,
        u.id AS usuario_id,
        u.nome_completo,
        u.email,
        u.telefone,
        DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') AS data_nascimento,
        p.cpf,
        p.sobre,
        e.cep,
        e.rua,
        e.bairro,
        e.cidade,
        e.estado,
        e.numero,
        e.complemento,
        COALESCE(GROUP_CONCAT(DISTINCT s.nome ORDER BY s.nome SEPARATOR '||'), '') AS servicos
      FROM profissionais p
      JOIN usuarios u ON u.id = p.usuario_id
      JOIN enderecos e ON e.id = u.endereco_id
      LEFT JOIN profissional_servicos ps ON ps.profissional_id = p.id
      LEFT JOIN servicos s ON s.id = ps.servico_id
      GROUP BY p.id
      ORDER BY p.id DESC`
    )

    const profissionaisFormatados = profissionais.map(profissional => ({
      ...profissional,
      servicos: profissional.servicos ? profissional.servicos.split('||') : []
    }))

    return res.status(200).json({ sucesso: true, profissionais: profissionaisFormatados })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ sucesso: false })
  }
}

exports.getById = async (req, res) => {
  try {
    const { id } = req.params

    const [profissionais] = await db.query(
      `SELECT 
        p.id,
        u.id AS usuario_id,
        u.nome_completo,
        u.email,
        u.telefone,
        DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') AS data_nascimento,
        p.cpf,
        p.sobre,
        e.cep,
        e.rua,
        e.bairro,
        e.cidade,
        e.estado,
        e.numero,
        e.complemento,
        COALESCE(GROUP_CONCAT(DISTINCT s.nome ORDER BY s.nome SEPARATOR '||'), '') AS servicos
      FROM profissionais p
      JOIN usuarios u ON u.id = p.usuario_id
      JOIN enderecos e ON e.id = u.endereco_id
      LEFT JOIN profissional_servicos ps ON ps.profissional_id = p.id
      LEFT JOIN servicos s ON s.id = ps.servico_id
      WHERE p.id = ?
      GROUP BY p.id`,
      [id]
    )

    if (profissionais.length === 0) {
      return res.status(404).json({ sucesso: false })
    }

    const profissional = {
      ...profissionais[0],
      servicos: profissionais[0].servicos ? profissionais[0].servicos.split('||') : []
    }

    return res.status(200).json({ sucesso: true, profissional })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ sucesso: false })
  }
}

exports.put = async (req, res) => {
  let connection

  try {
    const { id } = req.params
    const dados = req.body

    connection = await db.getConnection()
    await connection.beginTransaction()

    const profissional = await buscarProfissional(connection, id)

    if (!profissional) {
      await connection.rollback()
      return res.status(404).end()
    }

    const { campos: camposUsuario, valores: valoresUsuario } = getCamposUsuario(dados)

    if (dados.senha && dados.senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(dados.senha, 10)
      camposUsuario.push('senha = ?')
      valoresUsuario.push(senhaHash)
    }

    if (dados.data_nascimento !== undefined) {
      camposUsuario.push('data_nascimento = ?')
      valoresUsuario.push(converterDataParaBanco(dados.data_nascimento) || dados.data_nascimento || null)
    }

    if (camposUsuario.length > 0) {
      valoresUsuario.push(profissional.usuario_id)
      await connection.query(
        `UPDATE usuarios SET ${camposUsuario.join(', ')} WHERE id = ?`,
        valoresUsuario
      )
    }

    const camposProfissional = []
    const valoresProfissional = []

    if ('cpf' in dados) {
      camposProfissional.push('cpf = ?')
      valoresProfissional.push(String(dados.cpf || '').replace(/\D/g, ''))
    }

    if ('sobre' in dados || 'sobre_profissional' in dados) {
      camposProfissional.push('sobre = ?')
      valoresProfissional.push(dados.sobre ?? dados.sobre_profissional ?? null)
    }

    if (camposProfissional.length > 0) {
      valoresProfissional.push(id)
      await connection.query(
        `UPDATE profissionais SET ${camposProfissional.join(', ')} WHERE id = ?`,
        valoresProfissional
      )
    }

    const { campos: camposEndereco, valores: valoresEndereco } = getCamposEndereco(dados)

    if (camposEndereco.length > 0) {
      valoresEndereco.push(profissional.endereco_id)
      await connection.query(
        `UPDATE enderecos SET ${camposEndereco.join(', ')} WHERE id = ?`,
        valoresEndereco
      )
    }

    if ('servicos_prestados' in dados || 'servicos' in dados) {
      await salvarServicos(connection, id, dados.servicos_prestados ?? dados.servicos)
    }

    await connection.commit()
    return res.status(204).end()
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }

    console.error(error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).end()
    }

    return res.status(500).end()
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

exports.delete = async (req, res) => {
  let connection

  try {
    const { id } = req.params

    connection = await db.getConnection()
    await connection.beginTransaction()

    const profissional = await buscarProfissional(connection, id)

    if (!profissional) {
      await connection.rollback()
      return res.status(404).end()
    }

    await connection.query(`DELETE FROM profissional_servicos WHERE profissional_id = ?`, [id])
    await connection.query(`DELETE FROM profissionais WHERE id = ?`, [id])
    await connection.query(`DELETE FROM usuarios WHERE id = ?`, [profissional.usuario_id])

    const [usoEndereco] = await connection.query(
      'SELECT COUNT(*) AS total FROM usuarios WHERE endereco_id = ?',
      [profissional.endereco_id]
    )

    if (usoEndereco[0].total === 0) {
      await connection.query(`DELETE FROM enderecos WHERE id = ?`, [profissional.endereco_id])
    }

    await connection.commit()
    return res.status(204).end()
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }

    console.error(error)
    return res.status(500).end()
  } finally {
    if (connection) {
      connection.release()
    }
  }
}
