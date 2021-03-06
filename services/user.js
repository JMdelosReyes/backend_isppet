exports.getUser = async (connection, userId) => {
  const res = await connection('user_account')
      .where('user_account.id', userId)
      .first();
  if (!res) {
    const error = new Error();
    error.status = 400;
    error.message = 'No existe ningún usuario con esa ID.';
    throw error;
  }

  return res;
};

exports.getCanDelete = async (connection, userId, role) => {
  let publications = undefined;
  let pub2 = undefined;
  if (role === 'particular') {
    const particular = await connection('particular')
        .where('user_account_id', userId)
        .first();

    publications = await connection('publication')
        .where({particular_id: particular.id, transaction_status: 'In payment'})
        .orWhere({particular_id: particular.id, transaction_status: 'In progress'})
        .orWhere({particular_id: particular.id, transaction_status: 'Awaiting payment'})
        .first();

    pub2 = await connection('publication')
        .join('request', {'publication.id': 'request.publication_id', 'request.particular_id': particular.id})
        .where({status: 'Accepted', transaction_status: 'In payment'})
        .orWhere({status: 'Accepted', transaction_status: 'In progress'})
        .orWhere({status: 'Accepted', transaction_status: 'Awaiting payment'})
        .first();
  } else {
    const shelter = await connection('shelter')
        .select('id')
        .where('user_account_id', userId)
        .first();

    publications = await connection('adoption')
        .join('publication', 'publication.id', '=', 'adoption.publication_id')
        .where({shelter_id: shelter.id, transaction_status: 'In payment'})
        .orWhere({shelter_id: shelter.id, transaction_status: 'In progress'})
        .orWhere({shelter_id: shelter.id, transaction_status: 'Awaiting payment'})
        .first();
  }
  if (publications || pub2) {
    return false;
  } else {
    return true;
  }
};
