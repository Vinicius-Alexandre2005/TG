const db = require('../config/db')
const bcrypt = require('bcrypt')
const { withTransaction } = require('../utils/db_utils')
const { buildUserUpdate, buildAddressUpdate } = require('../utils/update_utils')

async function buscarCliente(connection, id) {
  const [rows] = await connection.query(
    `SELECT c.id, c.usuario_id, u.endereco_id
     FROM clientes c
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.id = ?`,
    [id]
  )
  return rows[0] || null
}

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, u.nome_completo, u.email, u.telefone, 
             DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') as data_nascimento,
             e.cidade, e.estado
      FROM clientes c
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN enderecos e ON u.endereco_id = e.id
    `)
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao listar clientes' })
  }
}

exports.getById = async (req, res) => {
  try {
    const { id } = req.params
    const [rows] = await db.query(`
      SELECT c.id, u.nome_completo, u.email, u.telefone, 
             DATE_FORMAT(u.data_nascimento, '%d/%m/%Y') as data_nascimento,
             e.cep, e.rua, e.bairro, e.cidade, e.estado, e.numero, e.complemento
      FROM clientes c
      JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN enderecos e ON u.endereco_id = e.id
      WHERE c.id = ?
    `, [id])
    
    if (rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' })
    res.json(rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ erro: 'Erro ao buscar cliente' })
  }
}

exports.put = async (req, res) => {
  const { id } = req.params
  const dados = req.body

  try {
    await withTransaction(async (connection) => {
      const cliente = await buscarCliente(connection, id)
      if (!cliente) throw { status: 404, message: 'Cliente não encontrado' }

      const { fields: userFields, values: userValues } = await buildUserUpdate(dados)
      if (userFields.length > 0) {
        userValues.push(cliente.usuario_id)
        await connection.query(`UPDATE usuarios SET ${userFields.join(', ')} WHERE id = ?`, userValues)
      }

      if (cliente.endereco_id) {
        const { fields: addrFields, values: addrValues } = buildAddressUpdate(dados)
        if (addrFields.length > 0) {
          addrValues.push(cliente.endereco_id)
          await connection.query(`UPDATE enderecos SET ${addrFields.join(', ')} WHERE id = ?`, addrValues)
        }
      }
      res.status(204).end()
    })
  } catch (error) {
    console.error(error)
    res.status(error.status || 500).json({ erro: error.message || 'Erro ao atualizar cliente' })
  }
}

exports.delete = async (req, res) => {
  const { id } = req.params
  try {
    await withTransaction(async (connection) => {
      const cliente = await buscarCliente(connection, id)
      if (!cliente) throw { status: 404, message: 'Cliente não encontrado' }

      await connection.query('DELETE FROM clientes WHERE id = ?', [id])
      await connection.query('DELETE FROM usuarios WHERE id = ?', [cliente.usuario_id])
      
      if (cliente.endereco_id) {
        const [uso] = await connection.query('SELECT COUNT(*) as total FROM usuarios WHERE endereco_id = ?', [cliente.endereco_id])
        if (uso[0].total === 0) {
          await connection.query('DELETE FROM enderecos WHERE id = ?', [cliente.endereco_id])
        }
      }
      res.status(204).end()
    })
  } catch (error) {
    console.error(error)
    res.status(error.status || 500).json({ erro: error.message || 'Erro ao deletar cliente' })
  }
}
