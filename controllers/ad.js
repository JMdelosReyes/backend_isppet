const adService = require('../services/ad');

exports.getRandomAds = async (req, res) => {
  const trx = await req.connection.transaction();
  const numAds = req.params.numAds || 3;

  try {
    const ads = await adService.getRandomAds(trx, numAds);
    await trx.commit();
    return res.status(200).send({ads});
  } catch (error) {
    await trx.rollback();

    if (error.status && error.message) {
      res.status(error.status).send({error: error.message});
    }
    return res.status(500).send({error});
  }
};