var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

var usersRouter = require('./routes/users')

var app = express()

// arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.static(path.join(__dirname, '../front-end')))

// API principal
app.use('/usuarios', usersRouter)

// catch 404
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  res.status(err.status || 500)
  res.render('error')
})

module.exports = app