const Datastore = require('nedb-promises');
const datastore = Datastore.create(`${__dirname}/database/db.db`);

module.exports = datastore;