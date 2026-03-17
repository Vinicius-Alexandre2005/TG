const mysql = require('mysql2/promise')
require('dotenv').config()

async function setup() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    })

    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`)
    await connection.query(`USE ${process.env.DB_NAME}`)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS enderecos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cep VARCHAR(20) NOT NULL,
            rua VARCHAR(100) NOT NULL,
            bairro VARCHAR(100) NOT NULL,
            numero VARCHAR(20) NOT NULL,
            complemento VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome_completo VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            telefone VARCHAR(20) NOT NULL,
            senha VARCHAR(255) NOT NULL,
            endereco_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (endereco_id) REFERENCES enderecos(id)
        );
    `)

    console.log('Tabelas criadas com sucesso')
    await connection.end()
  } catch (error) {
    console.error('Erro ao criar tabela:', error)
  }
}

setup()