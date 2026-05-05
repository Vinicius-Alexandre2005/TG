const db = require('../config/db')

async function withTransaction(callback) {
  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    if (connection) await connection.rollback()
    throw error
  } finally {
    if (connection) connection.release()
  }
}

module.exports = { withTransaction }