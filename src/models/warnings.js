const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Warnings = sequelize.define('warnings', {
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true
	},
	user_id: {
		type: DataTypes.STRING
	},
	admin_user_id: {
		type: DataTypes.STRING
	},
	reason: {
		type: DataTypes.STRING
	},
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
});

module.exports = Warnings;