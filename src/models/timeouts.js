const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Timeouts = sequelize.define('timeouts', {
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
	from_kick: {
		type: DataTypes.BOOLEAN,
		defaultValue: false
	},
	time_length: {
		type: DataTypes.STRING,
		defaultValue: '60s'
	},
	timestamp: {
		type: DataTypes.DATE,
		defaultValue: DataTypes.NOW
	}
});

module.exports = Timeouts;