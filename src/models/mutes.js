const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Mutes = sequelize.define('mutes', {
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
	timeamount: {
		type: DataTypes.INTEGER
	},
	reason: {
		type: DataTypes.STRING
	},
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
});

module.exports = Mutes;
