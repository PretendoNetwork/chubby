const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const MatchmakingThreads = sequelize.define('matchmaking_threads', {
	id: {
		type: DataTypes.STRING,
		primaryKey: true,
	},
	lastMessageSent: {
		type: DataTypes.DATE,
	},
});

module.exports = MatchmakingThreads;
