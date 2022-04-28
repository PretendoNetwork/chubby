const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Kicks = sequelize.define('kicks', {
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
	from_warning: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
});

module.exports = Kicks;