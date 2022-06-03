const Discord = require('discord.js');
const setupGuild = require('../setup-guild');
const sequelize = require('../sequelize');
const config = require('../../config.json');

/**
 * 
 * @param {Discord.Client} client
 */
async function readyHandler(client) {
	await sequelize.sync(config.sequelize);

	const guilds = await client.guilds.fetch();

	for (const id of guilds.keys()) {
		const guild = await guilds.get(id).fetch();

		await setupGuild(guild);
	}

	console.log(`Logged in as ${client.user.tag}!`);
}

module.exports = readyHandler;