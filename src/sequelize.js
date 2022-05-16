const Sequelize = require('sequelize');

const sequelize = new Sequelize({
	dialect: 'sqlite',
	storage: `${__dirname}/../database/database.sqlite`,
	logging: false
});

module.exports = sequelize;