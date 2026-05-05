require('dotenv').config()

const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')

const usersRouter = require('./routes/users')
const clientesRouter = require('./routes/clientes')
const profissionaisRouter = require('./routes/profissionais')
const authRouter = require('./routes/auth')

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, '../front-end')))

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/login/login.html'))
})

app.get('/', (req, res) => {
  res.redirect('/login')
})

app.use('/usuarios', usersRouter)
app.use('/clientes', clientesRouter)
app.use('/profissionais', profissionaisRouter)
app.use('/auth', authRouter)

app.use((req, res, next) => {
  next(createError(404, 'Rota não encontrada'))
})

app.use((err, req, res, next) => {
  console.error(err)

  res.status(err.status || 500).json({
    sucesso: false,
    erro: err.message || 'Erro interno do servidor'
  })
})

module.exports = app
