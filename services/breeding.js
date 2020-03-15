const path = require('path');
const fs = require('fs');
const {v4: uuidv4} = require('uuid');

const BREEDING_FIELDS = ['breeding.id',
  'publication_id',
  'particular_id',
  'creation_date',
  'animal_photo',
  'identification_photo',
  'document_status',
  'age',
  'genre',
  'breed',
  'transaction_status',
  'title',
  'price',
  'location',
  'pedigree',
  'type',
  'vaccine_passport'];

const ANIMAL_FOLDER = path.join('images', 'animal_photos');
const IDENTIFICATION_FOLDER = path.join('images', 'identification_photos');
const VACCINES_FOLDER = path.join('images', 'vaccine_passports');

const ALLOWED_EXTENSIONS = ['jpg', 'png', 'jpeg'];

exports.getBreeding = async (connection, breedingId) => {
  const breeding = await connection('breeding')
      .select(BREEDING_FIELDS)
      .join('publication', 'breeding.publication_id', '=', 'publication.id')
      .where('breeding.id', breedingId)
      .first();

  if (!breeding) {
    const error = new Error();
    error.status = 400;
    error.message = 'No breeding with that ID';
    throw error;
  }

  return breeding;
};

exports.createBreeding = async (breedingData, breedingPhotos, particularId, trx) => {
  const allPhotos = [];

  try {
    // Mínimo 2 fotos del animal
    const savedAnimalPhotos = [];
    if (breedingPhotos.animal_photo && breedingPhotos.animal_photo.length >= 2) {
      breedingPhotos.animal_photo.forEach((photo) => {
        const photoName = path.join(ANIMAL_FOLDER, `${uuidv4()}.${getExtension(photo.name)}`);
        savePhoto(photo, photoName);
        savedAnimalPhotos.push(photoName);
      });
    } else {
      const error = new Error();
      error.status = 400;
      error.message = 'It is required to upload at least two photos of the animal';
      throw error;
    }

    allPhotos.push(...savedAnimalPhotos);

    // Mínimo una foto identificativa
    const savedIdentificationPhotos = [];
    if (breedingPhotos.identification_photo) {
      if (Array.isArray(breedingPhotos.identification_photo)) {
        breedingPhotos.identification_photo.forEach((photo) => {
          const photoName = path.join(IDENTIFICATION_FOLDER, `${uuidv4()}.${getExtension(photo.name)}`);
          savePhoto(photo, photoName);
          savedIdentificationPhotos.push(photoName);
        });
      } else {
        const photoName = path.join(IDENTIFICATION_FOLDER, `${uuidv4()}.${getExtension(breedingPhotos.identification_photo.name)}`);
        savePhoto(breedingPhotos.identification_photo, photoName);
        savedIdentificationPhotos.push(photoName);
      }
    } else {
      const error = new Error();
      error.status = 400;
      error.message = 'It is required to upload at least one identification photo';
      throw error;
    }

    allPhotos.push(...savedIdentificationPhotos);

    // Mínimo una foto de las vacunas
    const savedVaccinePhotos = [];
    if (breedingPhotos.vaccine_passport) {
      if (Array.isArray(breedingPhotos.vaccine_passport)) {
        breedingPhotos.vaccine_passport.forEach((photo) => {
          const photoName = path.join(VACCINES_FOLDER, `${uuidv4()}.${getExtension(photo.name)}`);
          savePhoto(photo, photoName);
          savedVaccinePhotos.push(photoName);
        });
      } else {
        const photoName = path.join(VACCINES_FOLDER, `${uuidv4()}.${getExtension(breedingPhotos.vaccine_passport.name)}`);
        savePhoto(breedingPhotos.vaccine_passport, photoName);
        savedVaccinePhotos.push(photoName);
      }
    } else {
      const error = new Error();
      error.status = 400;
      error.message = 'It is required to upload at least one photo of the vaccine passport';
      throw error;
    }

    allPhotos.push(...savedVaccinePhotos);

    // Some values are not required during creation
    // Moderators will modify the breeding publication
    const pubData = {
      animal_photo: savedAnimalPhotos.join(','),
      identification_photo: savedIdentificationPhotos.join(','),
      document_status: 'In revision',
      age: breedingData.age || null,
      genre: breedingData.genre || null,
      breed: breedingData.breed || null,
      location: breedingData.location || null,
      type: breedingData.type || null,
      pedigree: breedingData.pedigree || null,
      transaction_status: 'In progress',
      title: breedingData.title,
      particular_id: particularId,
      vaccine_passport: savedVaccinePhotos.join(','),
    };

    const publicationId = await trx('publication').insert(pubData);
    const breedingId = await trx('breeding').insert({
      publication_id: publicationId,
      price: breedingData.price,
    });

    return await trx('breeding')
        .join('publication', 'breeding.publication_id', '=', 'publication.id')
        .select(BREEDING_FIELDS)
        .where({'breeding.id': breedingId})
        .first();
  } catch (error) {
    // Borramos las fotos guardadas en caso de error
    allPhotos.forEach((photo) => {
      fs.unlink(path.join('public', photo), (err) => {
        // nothing to do
      });
    });
    throw error;
  }
};

exports.getMyInterestedBreedings = async (connection, userId) => {
  const particular = await connection('particular').select('id')
      .where('user_account_id', userId).first();
  const breedings = await connection('breeding')
      .join('publication', 'breeding.publication_id', '=', 'publication.id')
      .join('particular', 'particular.id', '=', 'publication.particular_id')
      .join('request', 'request.particular_id', '=', 'particular.id')
      .where('particular.id', particular.id)
      .andWhere('request.status', 'Pending');

  return breedings;
};

exports.getBreedingsOffers = async (breedingParams, connection, userId) => {
  const user = await connection('user_account').select('id')
      .where('user_account.id', userId).andWhere('user_account.role', 'particular').first();

  if (!user) {
    const error = new Error();
    error.status = 404;
    error.message = 'Not found user';
    throw error;
  }

  const location = breedingParams.location;
  const age = breedingParams.age;
  const type = breedingParams.type;
  const breed = breedingParams.breed;
  const pedigree = breedingParams.pedigree;

  const breedings = await connection('breeding')
      .join('publication', 'breeding.publication_id', '=', 'publication.id')
      .where('publication.document_status', 'Accepted')
      .andWhere('publication.transaction_status', 'In progress')
      .andWhereNot('publication.particular_id', user.id)
      .modify(function(queryBuilder) {
        if (location) {
          queryBuilder.andWhere('publication.location', 'like', `%${location}%`);
        }
        if (age) {
          queryBuilder.andWhere('publication.age', age);
        }
        if (type) {
          queryBuilder.andWhere('publication.type', 'like', `%${type}%`);
        }
        if (breed) {
          queryBuilder.andWhere('publication.breed', 'like', `%${breed}%`);
        }
        if (pedigree) {
          queryBuilder.andWhere('publication.pedigree', pedigree);
        }
      });
  return breedings;
};

exports.getPendingBreedings = async (connection, userId) => {
  const user = await connection('moderator').select('id').where('user_account_id', userId).first();
  if (!user) {
    const error = new Error();
    error.status = 404;
    error.message = 'Not found user';
    throw error;
  }

  const breedings = await connection('breeding')
      .join('publication', 'breeding.publication_id', '=', 'publication.id')
      .where('publication.document_status', 'In revision');
  return breedings;
};

exports.imInterested = async (userId, breedingId, trx) => {
  // Se comprueba que no se intenta estar interesado en una publication propia
  const pub = await trx('publication')
      .join('breeding', 'breeding.publication_id', '=', 'publication.id')
      .where('breeding.id', breedingId)
      .first();

  if (pub == undefined || pub.particular_id === userId) {
    const error = new Error();
    error.status = 404;
    error.message = 'You can not be interested in your own publications';
    throw error;
  }

  // Se comprueba que esta publicacion no este con una request pendiente del usuario actual
  const rqt = await trx('request')
      .where({publication_id: pub.publication_id})
      .andWhere({particular_id: userId})
      .first();

  if (rqt && rqt.status === 'Pending') {
    const error = new Error();
    error.status = 404;
    error.message = 'Already interested or concluded';
    throw error;
  }

  // Se comprueba que esta publicacion tenga los documentos verificados y todavia este en progreso
  const wrongPub = await trx('publication')
      .join('breeding', 'breeding.publication_id', '=', 'publication.id')
      .where({'publication.document_status': 'Accepted'})
      .andWhere({'publication.transaction_status': 'In progress'})
      .andWhere({'breeding.id': breedingId});

  if (!wrongPub.length) {
    const error = new Error();
    error.status = 404;
    error.message = 'The publication documents or status are wrong';
    throw error;
  }

  if (rqt != undefined) {
    await trx('request')
        .where({id: rqt.id})
        .update({
          status: 'Pending',
        });
    return await trx('request').where({id: rqt.id}).first();
  } else {
    const rqtData = {
      status: 'Pending',
      publication_id: pub.publication_id,
      particular_id: userId,
    };

    const requestId = await trx('request').insert(rqtData);
    return await trx('request').where({id: requestId}).first();
  }

  // Comprobar que la request no sea del propia usuario y que sea visible para todo el mundo
};

const savePhoto = async (photo, photoRoute) => {
  await photo.mv(path.join('public', photoRoute));
};

const getExtension = (photo) => {
  const extension = photo.split('.').pop();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    const error = new Error();
    error.status = 404;
    error.message = 'No valid extension';
    throw error;
  }
  return photo.split('.').pop();
};


