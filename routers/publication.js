const express = require('express');
const router = new express.Router();
const publicationController = require('../controllers/publication');
const authorization = require('../authorization/index');

router.get('/status/:status', authorization.moderator, (req, res) => publicationController.getPublicationStatus(req, res));
router.get('/user/:id', authorization.shelter_particular, (req, res) => publicationController.getPublicationsByActorId(req, res));
router.get('/:id', authorization.all, (req, res) => publicationController.getPublication(req, res));

module.exports = router;