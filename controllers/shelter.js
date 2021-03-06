const shelterService = require('../services/shelter');

exports.getShelters = async (req, res) => {
  try {
    const page = req.query.page || 0;
    if (isNaN(page)) {
      return res.status(401).send('Invalid params');
    }

    const connection = req.connection;

    const shelter = await shelterService.getShelters(connection, page);
    return res.status(200).send(shelter);
  } catch (error) {
    console.log(error);
    if (error.status && error.message) {
      return res.status(error.status).send({error: error.message});
    }
    return res.status(500).send({error});
  }
};

exports.getShelter = async (req, res) => {
  try {
    const connection = req.connection;

    const shelterId = req.params.id;
    if (isNaN(shelterId)) {
      return res.status(400).send({error: 'ID must be a number'});
    }

    const shelter = await shelterService.getShelter(connection, shelterId);
    return res.status(200).send({shelter});
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).send({error: error.message});
    }
    return res.status(500).send({error});
  }
};

exports.getMyData = async (req, res) => {
  try {
    const connection = req.connection;

    const userId = req.user.id;

    const data = await shelterService.getMyData(
        connection,
        userId,
    );

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=Mis_datos_LinkedPet.pdf',
      'Content-Length': data.length,
    });
    return res.end(data);
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).send({error: error.message});
    }
    return res.status(500).send({error});
  }
};

exports.deleteShelter = async (req, res) => {
  const connection = req.connection;

  // create transaction
  const trx = await connection.transaction();

  try {
    const userId = req.user.id;

    const shelter = await shelterService.deleteShelter(
        trx,
        userId,
    );

    await trx.commit();

    return res.status(200).send({shelter});
  } catch (error) {
    // rollback
    await trx.rollback();

    if (error.status && error.message) {
      return res.status(error.status).send({error: error.message});
    }
    return res.status(500).send({error});
  }
};

exports.getShelterLogged = async (req, res) => {
  try {
    const connection = req.connection;

    const userId = req.user.id;

    const shelter = await shelterService.getShelterLogged(
        connection,
        userId,
    );
    return res.status(200).send({shelter});
  } catch (error) {
    if (error.status && error.message) {
      return res.status(error.status).send({error: error.message});
    }
    return res.status(500).send({error});
  }
};
