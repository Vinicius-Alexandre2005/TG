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

async function buscarCliente(connection, id) {
  const [clientes] = await connection.query(
    `SELECT 
      c.id,
      c.usuario_id,
      u.endereco_id
     FROM clientes c
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.id = ?`,
    [id]
  )

  return clientes[0] || null
}

exports.getAll = async (req, res) => {
  try {
    const [clientes] = await db.query(
      `SELECT 
        c.id,
        u.id AS usuario_id,
        u.nome_completo,
        u.email,
        u.telefone,
        DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') AS data_nascimento,
        e.cep,
        e.rua,
        e.bairro,
        e.cidade,
        e.estado,
        e.numero,
        e.complemento
      FROM clientes c
      JOIN usuarios u ON u.id = c.usuario_id
      JOIN enderecos e ON e.id = u.endereco_id
      ORDER BY c.id DESC`
    )

    return res.status(200).json({ sucesso: true, clientes })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ sucesso: false })
  }
}

exports.getById = async (req, res) => {
  try {
    const { id } = req.params

    const [clientes] = await db.query(
      `SELECT 
        c.id,
        u.id AS usuario_id,
        u.nome_completo,
        u.email,
        u.telefone,
        DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') AS data_nascimento,
        e.cep,
        e.rua,
        e.bairro,
        e.cidade,
        e.estado,
        e.numero,
        e.complemento
      FROM clientes c
      JOIN usuarios u ON u.id = c.usuario_id
      JOIN enderecos e ON e.id = u.endereco_id
      WHERE c.id = ?`,
      [id]
    )

    if (clientes.length === 0) {
      return res.status(404).json({ sucesso: false })
    }

    return res.status(200).json({ sucesso: true, cliente: clientes[0] })
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

    const cliente = await buscarCliente(connection, id)

    if (!cliente) {
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
      valoresUsuario.push(cliente.usuario_id)
      await connection.query(
        `UPDATE usuarios SET ${camposUsuario.join(', ')} WHERE id = ?`,
        valoresUsuario
      )
    }

    const { campos: camposEndereco, valores: valoresEndereco } = getCamposEndereco(dados)

    if (camposEndereco.length > 0) {
      valoresEndereco.push(cliente.endereco_id)
      await connection.query(
        `UPDATE enderecos SET ${camposEndereco.join(', ')} WHERE id = ?`,
        valoresEndereco
      )
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

    const cliente = await buscarCliente(connection, id)

    if (!cliente) {
      await connection.rollback()
      return res.status(404).end()
    }

    await connection.query(`DELETE FROM clientes WHERE id = ?`, [id])
    await connection.query(`DELETE FROM usuarios WHERE id = ?`, [cliente.usuario_id])

    const [usoEndereco] = await connection.query(
      'SELECT COUNT(*) AS total FROM usuarios WHERE endereco_id = ?',
      [cliente.endereco_id]
    )

    if (usoEndereco[0].total === 0) {
      await connection.query(`DELETE FROM enderecos WHERE id = ?`, [cliente.endereco_id])
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
