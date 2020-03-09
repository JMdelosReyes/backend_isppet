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
  'vaccine_passport'];

const ANIMAL_FOLDER = path.join('images', 'animal_photos');
const IDENTIFICATION_FOLDER = path.join('images', 'identification_photos');
const VACCINES_FOLDER = path.join('images', 'vaccines_passports');

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

    // Genre, age and breed not required during creation
    const pubData = {
      animal_photo: savedAnimalPhotos.join(','),
      identification_photo: savedIdentificationPhotos.join(','),
      document_status: 'In revision',
      // age: breedingData.age,
      // genre: breedingData.genre,
      // breed: breedingData.breed,
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
      console.log(photo);
      fs.unlink(path.join('public', photo), (err) => {
        // nothing to do
      });
    });

    if (error.status && error.message) {
      throw error;
    }
    throw error;
  }
};

exports.getMyFavoriteBreedings = async (connection, userId) => {
  const user = await connection('particular').select('id').where({user_account_id: userId}).first();
  if (!user) {
    const error = new Error();
    error.status = 404;
    error.message = 'Not found user';
    throw error;
  }

  const breedings = await connection('breeding')
      .join('publication', 'breeding.publication_id', '=', 'publication.id')
      .join('particular', 'particular.id', '=', 'publication.particular_id')
      .join('request', 'request.particular_id', '=', 'particular.id')
      .where({'particular.id': user.id})
      .andWhere({'request.is_favorite': true});

  return breedings;
};

exports.imInterested = async (userId, breedingId, trx) => {
  // Se comprueba que no se hace
  const pub = await trx('publication')
      .join('breeding', 'breeding.publication_id', '=', 'publication.id')
      .where({'breeding.id': breedingId})
      .first();

  if (pub.particular_id === userId) {
    const error = new Error();
    error.status = 404;
    error.message = 'You can not make your own publications favorite';
    throw error;
  }

  // Se comprueba que esta publicacion no este en los favoritos del particular
  const rqt = await trx('request')
      .where({publication_id: pub.publication_id})
      .andWhere({particular_id: userId})
      .first();

  if (rqt && rqt.is_favorite) {
    const error = new Error();
    error.status = 404;
    error.message = 'Already favorite';
    throw error;
  }

  const wrongPub = await trx('publication')
      .join('breeding', 'breeding.publication_id', '=', 'publication.id')
      .where({'publication.document_status': 'Accepted'})
      .andWhere({'publication.transaction_status': 'In progress'})
      .andWhere({'breeding.id': breedingId});

  if (wrongPub.length == 0) {
    const error = new Error();
    error.status = 404;
    error.message = 'The publication documents or status are wrong';
    throw error;
  }

  if (rqt) {
    await trx('request')
        .where({id: rqt.id})
        .update({
          is_favorite: true,
        });

    return await trx('request')
        .where({id: rqt.id}).first();
  } else {
    const rqtData = {
      status: 'Favorite',
      is_favorite: true,
      publication_id: pub.publication_id,
      particular_id: userId,
    };

    const requestId = await trx('request').insert(rqtData);
    return await trx('request')
        .where({id: requestId}).first();
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


