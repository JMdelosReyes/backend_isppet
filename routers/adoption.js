const express = require('express');
const router = new express.Router();
const adoptionController = require('../controllers/adoption');
const authorization = require('../authorization/index');

router.get('/particular', authorization.particular, (req, res) => adoptionController.getParticularAdoptions(req, res));
router.get('/pending', authorization.moderator, (req, res) => adoptionController.getPendingAdoptions(req, res));
router.post('/', authorization.shelter_particular, (req, res) => adoptionController.createAdoption(req, res));
router.put('/edit/:id', authorization.shelter, (req, res) => adoptionController.updateAdoption(req, res));
router.get('/:id', authorization.all, (req, res) => adoptionController.getAdoption(req, res));
router.put('/accept/:id', authorization.moderator, (req, res) => adoptionController.acceptAdoption(req, res));
router.put('/reject/:id', authorization.moderator, (req, res) => adoptionController.rejectAdoption(req, res));

module.exports = router;
