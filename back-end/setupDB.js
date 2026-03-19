const mysql = require('mysql2/promise')
require('dotenv').config()

async function colunaExiste(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME, tableName, columnName]
  )

  return rows[0].total > 0
}

async function tabelaExiste(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME, tableName]
  )

  return rows[0].total > 0
}

async function indiceExiste(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [process.env.DB_NAME, tableName, indexName]
  )

  return rows[0].total > 0
}

async function setup() {
  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    })

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``)
    await connection.query(`USE \`${process.env.DB_NAME}\``)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS enderecos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cep VARCHAR(20) NOT NULL,
        rua VARCHAR(100) NOT NULL,
        bairro VARCHAR(100) NOT NULL,
        cidade VARCHAR(100) NOT NULL,
        estado VARCHAR(2) NOT NULL,
        numero VARCHAR(20) NOT NULL,
        complemento VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `)

    if (!(await colunaExiste(connection, 'enderecos', 'cidade'))) {
      await connection.query(`ALTER TABLE enderecos ADD COLUMN cidade VARCHAR(100) NOT NULL DEFAULT '' AFTER bairro`)
    }

    if (!(await colunaExiste(connection, 'enderecos', 'estado'))) {
      await connection.query(`ALTER TABLE enderecos ADD COLUMN estado VARCHAR(2) NOT NULL DEFAULT '' AFTER cidade`)
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome_completo VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        data_nascimento DATE NULL,
        tipo_usuario ENUM('cliente', 'profissional') NOT NULL DEFAULT 'cliente',
        endereco_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_usuarios_endereco FOREIGN KEY (endereco_id) REFERENCES enderecos(id)
      ) ENGINE=InnoDB;
    `)

    if (!(await colunaExiste(connection, 'usuarios', 'data_nascimento'))) {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN data_nascimento DATE NULL AFTER senha`)
    }

    if (!(await colunaExiste(connection, 'usuarios', 'tipo_usuario'))) {
      await connection.query(`ALTER TABLE usuarios ADD COLUMN tipo_usuario ENUM('cliente', 'profissional') NOT NULL DEFAULT 'cliente' AFTER data_nascimento`)
    }

    if (!(await indiceExiste(connection, 'usuarios', 'uk_usuarios_email'))) {
      const [duplicados] = await connection.query(
        `SELECT email, COUNT(*) AS total FROM usuarios GROUP BY email HAVING COUNT(*) > 1`
      )

      if (duplicados.length === 0) {
        await connection.query(`ALTER TABLE usuarios ADD CONSTRAINT uk_usuarios_email UNIQUE (email)`)
      } else {
        console.warn('Não foi possível criar UNIQUE em usuarios.email porque existem e-mails duplicados.')
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_clientes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS profissionais (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL UNIQUE,
        cpf VARCHAR(14) NOT NULL,
        sobre TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_profissionais_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `)

    if (!(await indiceExiste(connection, 'profissionais', 'uk_profissionais_cpf'))) {
      const [duplicadosCpf] = await connection.query(
        `SELECT cpf, COUNT(*) AS total FROM profissionais GROUP BY cpf HAVING COUNT(*) > 1`
      )

      if (duplicadosCpf.length === 0) {
        await connection.query(`ALTER TABLE profissionais ADD CONSTRAINT uk_profissionais_cpf UNIQUE (cpf)`)
      } else {
        console.warn('Não foi possível criar UNIQUE em profissionais.cpf porque existem CPFs duplicados.')
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS servicos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS profissional_servicos (
        profissional_id INT NOT NULL,
        servico_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (profissional_id, servico_id),
        CONSTRAINT fk_profissional_servicos_profissional FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
        CONSTRAINT fk_profissional_servicos_servico FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `)

    const usuariosExistem = await tabelaExiste(connection, 'usuarios')

    if (usuariosExistem) {
      await connection.query(`
        INSERT INTO clientes (usuario_id)
        SELECT u.id
        FROM usuarios u
        LEFT JOIN clientes c ON c.usuario_id = u.id
        LEFT JOIN profissionais p ON p.usuario_id = u.id
        WHERE u.tipo_usuario = 'cliente'
          AND c.usuario_id IS NULL
          AND p.usuario_id IS NULL
      `)
    }

    console.log('Banco atualizado com sucesso.')
    await connection.end()
  } catch (error) {
    console.error('Erro ao configurar banco:', error)
    if (connection) {
      await connection.end()
    }
  }
}

setup()
