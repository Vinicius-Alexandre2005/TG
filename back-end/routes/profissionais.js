const express = require('express')
const router = express.Router()

const profissionalController = require('../controllers/profissional_controller')

router.get('/', profissionalController.getAll)
router.get('/:id', profissionalController.getById)
router.put('/:id', profissionalController.put)

module.exports = router