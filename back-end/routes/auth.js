const express = require('express')
const router = express.Router()

const controller = require('../controllers/auth_controller')
const authMiddleware = require('../middleware/auth_middleware')

router.post('/login', controller.login)
router.get('/perfil', authMiddleware, controller.perfil)
router.put('/perfil', authMiddleware, controller.updatePerfil)

module.exports = router
