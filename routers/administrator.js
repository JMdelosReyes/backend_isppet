const express = require('express');
const router = new express.Router();
const administratorController = require('../controllers/administrator');
const authorization = require('../authorization/index');

router.put('/ban/:id', authorization.administrator, (req, res) => administratorController.banUser(req, res));
router.get('/ban/list', authorization.administrator, (req, res) => administratorController.getBanUsers(req, res));
router.put('/unban/:id', authorization.administrator, (req, res) => administratorController.unbanUser(req, res));
router.get('/unban/list', authorization.administrator, (req, res) => administratorController.getUnbanUsers(req, res));
router.get('/unban/particular/list', authorization.administrator, (req, res) => administratorController.getUnbanParticulars(req, res));
router.get('/unban/moderator/list', authorization.administrator, (req, res) => administratorController.getUnbanModerator(req, res));
router.get('/unban/shelter/list', authorization.administrator, (req, res) => administratorController.getUnbanShelter(req, res));
router.get('/unban/administrator/list', authorization.administrator, (req, res) => administratorController.getUnbanAdministrator(req, res));
router.put('/ad/edit/:id', authorization.administrator, (req, res) => administratorController.updateAd(req, res));
router.post('/ad/create', authorization.administrator, (req, res) => administratorController.createAd(req, res));
router.put('/ad/activate/:id', authorization.administrator, (req, res) => administratorController.activateAd(req, res));
router.put('/ad/deactivate/:id', authorization.administrator, (req, res) => administratorController.deactivateAd(req, res));
router.get('/getPremiumVets', authorization.administrator, (req, res) => administratorController.getPremiumVets(req, res));
router.post('/vet/add', authorization.administrator, (req, res) => administratorController.addVet(req, res));
router.put('/vet/edit/:id', authorization.administrator, (req, res) => administratorController.updateVet(req, res));
router.post('/registerShelter', authorization.administrator, (req, res) => administratorController.registerShelter(req, res));
router.get('/statistics', authorization.administrator, (req, res) => administratorController.getStatistics(req, res));
router.post('/breachNotification', authorization.administrator, (req, res) => administratorController.sendBreachNotification(req, res));
router.post('/contactMe', administratorController.contactMe);
router.get('/allAds', authorization.administrator, (req, res) => administratorController.getAllAds(req, res));


module.exports = router;
