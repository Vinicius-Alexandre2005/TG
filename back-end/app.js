var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

var usersRouter = require('./routes/users')
var clientesRouter = require('./routes/clientes')
var profissionaisRouter = require('./routes/profissionais')

var app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, '../front-end')))

app.use('/usuarios', usersRouter)
app.use('/clientes', clientesRouter)
app.use('/profissionais', profissionaisRouter)

app.use(function(req, res, next) {
  next(createError(404))
})

app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({
    sucesso: false,
    erro: err.message
  })
})

module.exports = app
