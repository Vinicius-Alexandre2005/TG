var express = require('express')
var router = express.Router()
const profissionalController = require('../controllers/profissional_controller')

router.get('/', profissionalController.getAll)
router.get('/:id', profissionalController.getById)
router.put('/:id', profissionalController.put)
router.delete('/:id', profissionalController.delete)

module.exports = router
