const Discord = require('discord.js');
const glob = require('glob');
const path = require('path');
const setupGuild = require('../setup-guild');
const sequelize = require('../sequelize');
const config = require('../../config.json');

/**
 * 
 * @param {Discord.Client} client
 */
async function readyHandler(client) {
	loadBotHandlersCollection('commands', client.commands);
	console.log('Registered global commands');

	await sequelize.sync(config.sequelize);

	const guilds = await client.guilds.fetch();

	for (const id of guilds.keys()) {
		const guild = await guilds.get(id).fetch();

		await setupGuild(guild);
	}

	console.log(`Logged in as ${client.user.tag}!`);
}

/**
 *
 * @param {String} name
 * @param {Discord.Collection} collection
 */
function loadBotHandlersCollection(name, collection) {
	const files = glob.sync(`${__dirname}/../${name}/**/*.js`);

	for (const file of files) {
		const handler = require(path.resolve(file));

		collection.set(handler.name, handler);
	}
}

module.exports = readyHandler;