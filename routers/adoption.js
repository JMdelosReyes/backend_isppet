const express = require('express');
const router = new express.Router();
const adoptionController = require('../controllers/adoption');
const authorization = require('../authorization/index');

router.get('/available', authorization.particular, (req, res) =>adoptionController.getAdoptions(req, res));
router.get('/particular', authorization.particular, (req, res) =>adoptionController.getParticularAdoptions(req, res));
router.get('/offers', authorization.shelter_particular, (req, res) =>adoptionController.getAdoptionsOffers(req, res));
router.get('/pending', authorization.moderator, (req, res) =>adoptionController.getPendingAdoptions(req, res));
router.post('/interested/:id', authorization.particular, (req, res) =>adoptionController.imInterested(req, res));
router.post('/', authorization.shelter_particular, (req, res) =>adoptionController.createAdoption(req, res));
router.put('/edit/:id', authorization.shelter_particular, (req, res) =>adoptionController.updateAdoption(req, res));
router.get('/:id', authorization.all, (req, res) =>adoptionController.getAdoption(req, res));
router.put('/accept/:id', authorization.moderator, (req, res) =>adoptionController.acceptAdoption(req, res));
router.put('/reject/:id', authorization.moderator, (req, res) =>adoptionController.rejectAdoption(req, res));
router.delete('/delete/:id', authorization.shelter_particular, (req, res) => adoptionController.deleteAdoption(req, res));
router.post('/pet', authorization.shelter, (req, res) => adoptionController.createAdoptionWithPet(req, res));
router.put('/pet/edit/:id', authorization.shelter, (req, res) => adoptionController.editAdoptionWithPet(req, res));

module.exports = router;
