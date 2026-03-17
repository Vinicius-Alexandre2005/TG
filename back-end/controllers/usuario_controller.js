const db = require('../config/db')
const bcrypt = require('bcrypt')

// POST

exports.post = async (req, res) => {
  let connection

  try {
    const {
      nome_completo,
      email,
      telefone,
      senha,
      cep,
      rua,
      bairro,
      numero,
      complemento
    } = req.body

    connection = await db.getConnection()
    await connection.beginTransaction()

    const senhaHash = await bcrypt.hash(senha, 10)

    const [enderecoResult] = await connection.query(
      `INSERT INTO enderecos (cep, rua, bairro, numero, complemento)
       VALUES (?, ?, ?, ?, ?)`,
      [cep, rua, bairro, numero, complemento || null]
    )

    const enderecoId = enderecoResult.insertId

    const [usuarioResult] = await connection.query(
      `INSERT INTO usuarios (nome_completo, email, telefone, senha, endereco_id)
       VALUES (?, ?, ?, ?, ?)`,
      [nome_completo, email, telefone, senhaHash, enderecoId]
    )

    await connection.commit()

    return res.status(201).json({
      sucesso: true,
      id: usuarioResult.insertId
    })
  } catch (error) {
    if (connection) {
      await connection.rollback()
    }

    console.error(error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        sucesso: false
      })
    }

    return res.status(500).json({
      sucesso: false
    })
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

// GET ALL

exports.getAll = async (req, res) => {
  try {
    const [usuarios] = await db.query(
      `SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.telefone,
        e.cep,
        e.rua,
        e.bairro,
        e.numero,
        e.complemento
      FROM usuarios u
      JOIN enderecos e ON u.endereco_id = e.id`
    )

    return res.status(200).json({
      sucesso: true,
      usuarios
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      sucesso: false
    })
  }
}

// GET ONE

exports.getById = async (req, res) => {
  try {
    const { id } = req.params

    const [usuarios] = await db.query(
      `SELECT 
        u.id,
        u.nome_completo,
        u.email,
        u.telefone,
        e.cep,
        e.rua,
        e.bairro,
        e.numero,
        e.complemento
      FROM usuarios u
      JOIN enderecos e ON u.endereco_id = e.id
      WHERE u.id = ?`,
      [id]
    )

    if (usuarios.length === 0) {
      return res.status(404).json({
        sucesso: false
      })
    }

    return res.status(200).json({
      sucesso: true,
      usuario: usuarios[0]
    })

  } catch (error) {
    console.error(error)

    return res.status(500).json({
      sucesso: false
    })
  }
}

// PUT

exports.put = async (req, res) => {
  let connection

  try {
    const { id } = req.params
    const dados = req.body

    connection = await db.getConnection()
    await connection.beginTransaction()

    const [usuarios] = await connection.query(
      `SELECT * FROM usuarios WHERE id = ?`,
      [id]
    )

    if (usuarios.length === 0) {
      await connection.rollback()
      return res.status(404).end()
    }

    const usuario = usuarios[0]

    // USUÁRIO
    const camposUsuario = []
    const valoresUsuario = []

    for (let campo in dados) {
      if (
        ['nome_completo', 'email', 'telefone'].includes(campo)
      ) {
        camposUsuario.push(`${campo} = ?`)
        valoresUsuario.push(dados[campo])
      }
    }

    if (dados.senha && dados.senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(dados.senha, 10)
      camposUsuario.push('senha = ?')
      valoresUsuario.push(senhaHash)
    }

    if (camposUsuario.length > 0) {
      valoresUsuario.push(id)

      await connection.query(
        `UPDATE usuarios SET ${camposUsuario.join(', ')} WHERE id = ?`,
        valoresUsuario
      )
    }

    // ENDEREÇO
    const camposEndereco = []
    const valoresEndereco = []

    for (let campo in dados) {
      if (
        ['cep', 'rua', 'bairro', 'numero'].includes(campo)
      ) {
        camposEndereco.push(`${campo} = ?`)
        valoresEndereco.push(dados[campo])
      }
    }

    if ('complemento' in dados) {
      camposEndereco.push('complemento = ?')
      valoresEndereco.push(dados.complemento || null)
    }

    if (camposEndereco.length > 0) {
      valoresEndereco.push(usuario.endereco_id)

      await connection.query(
        `UPDATE enderecos SET ${camposEndereco.join(', ')} WHERE id = ?`,
        valoresEndereco
      )
    }

    await connection.commit()

    return res.status(204).end()

  } catch (error) {
    if (connection) await connection.rollback()

    console.error(error)

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).end()
    }

    return res.status(500).end()
  } finally {
    if (connection) connection.release()
  }
}

// DELETE

exports.delete = async (req, res) => {
  let connection

  try {
    const { id } = req.params

    connection = await db.getConnection()
    await connection.beginTransaction()

    const [usuarios] = await connection.query(
      `SELECT * FROM usuarios WHERE id = ?`,
      [id]
    )

    if (usuarios.length === 0) {
      await connection.rollback()
      return res.status(404).end()
    }

    const usuario = usuarios[0]

    await connection.query(
      `DELETE FROM usuarios WHERE id = ?`,
      [id]
    )

    await connection.query(
      `DELETE FROM enderecos WHERE id = ?`,
      [usuario.endereco_id]
    )

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