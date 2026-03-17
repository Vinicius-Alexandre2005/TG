var express = require('express')
var router = express.Router()
const users_controller = require('../controllers/usuario_controller')

router.post('/cadastro', users_controller.post)
router.get('/', users_controller.getAll)
router.get('/:id', users_controller.getById)
router.put('/:id', users_controller.put)
router.delete('/:id', users_controller.delete)

module.exports = router
