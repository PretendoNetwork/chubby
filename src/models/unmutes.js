const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Unmutes = sequelize.define('unmutes', {
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
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
});

module.exports = Unmutes;