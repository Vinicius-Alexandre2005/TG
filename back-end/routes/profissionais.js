var express = require('express')
var router = express.Router()
const profissionalController = require('../controllers/profissional_controller')

router.put('/:id', profissionalController.put)

module.exports = router