var express = require('express')
var router = express.Router()
const clienteController = require('../controllers/cliente_controller')

router.get('/', clienteController.getAll)
router.get('/:id', clienteController.getById)
router.put('/:id', clienteController.put)
router.delete('/:id', clienteController.delete)

module.exports = router
