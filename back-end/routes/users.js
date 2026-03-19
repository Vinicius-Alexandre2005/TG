const express = require('express')
const router = express.Router()
const usuarioController = require('../controllers/usuario_controller')

router.post('/cadastro', usuarioController.cadastrarUsuario)

router.get('/', usuarioController.listarUsuarios)
router.get('/:id', usuarioController.buscarUsuarioPorId)
router.put('/:id', usuarioController.atualizarUsuario)
router.delete('/:id', usuarioController.deletarUsuario)

module.exports = router