const bcrypt = require('bcrypt')
const { converterDataParaBanco } = require('./formatadores')

function buildUpdateQuery(data, tableFields, idFieldName = 'id') {
  const fields = []
  const values = []

  for (const fieldName of tableFields) {
    if (data[fieldName] !== undefined) {
      fields.push(`${fieldName} = ?`)
      values.push(data[fieldName])
    }
  }

  if (fields.length === 0) {
    return { query: '', values: [] }
  }

  const query = `UPDATE ${tableFields.tableName} SET ${fields.join(', ')} WHERE ${idFieldName} = ?`
  values.push(data[idFieldName])

  return { query, values }
}

async function buildUserUpdate(data) {
  const userFields = [
    'nome_completo',
    'email',
    'telefone',
    'data_nascimento',
    'tipo_usuario'
  ]
  const updateData = { ...data }

  if (data.senha !== undefined && String(data.senha).trim() !== '') {
    updateData.senha = await bcrypt.hash(String(data.senha), 10)
  }

  if (data.data_nascimento !== undefined) {
    updateData.data_nascimento = converterDataParaBanco(data.data_nascimento) || null
  }

  const fields = []
  const values = []

  for (const fieldName of userFields) {
    if (updateData[fieldName] !== undefined) {
      fields.push(`${fieldName} = ?`)
      values.push(updateData[fieldName])
    }
  }

  return { fields, values }
}

function buildAddressUpdate(data) {
  const addressFields = [
    'cep',
    'rua',
    'bairro',
    'cidade',
    'estado',
    'numero',
    'complemento'
  ]
  const updateData = { ...data }

  if (data.complemento !== undefined) {
    updateData.complemento = data.complemento || null
  }

  const fields = []
  const values = []

  for (const fieldName of addressFields) {
    if (updateData[fieldName] !== undefined) {
      fields.push(`${fieldName} = ?`)
      values.push(updateData[fieldName])
    }
  }

  return { fields, values }
}

module.exports = {
  buildUpdateQuery,
  buildUserUpdate,
  buildAddressUpdate
}