const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { bot_token: botToken } = require('../config.json');
const rest = new REST({ version: '10' }).setToken(botToken);

/**
 * 
 * @param {Discord.Guild} guild
 */
async function setupGuild(guild) {
	// do nothing if the bot does not have the correct permissions
	if (!guild.me.permissions.has([Discord.Permissions.FLAGS.MANAGE_ROLES, Discord.Permissions.FLAGS.MANAGE_CHANNELS])) {
		console.log('Bot does not have permissions to set up in guild', guild.name);
		return;
	}

	// Populate members cache
	await guild.members.fetch();

	// Setup commands
	await deployCommands(guild);
}

/**
 *
 * @param {Discord.Guild} guild
 */
async function deployCommands(guild) {
	const deploy = [];

	guild.client.commands.forEach((command) => {
		deploy.push(command.deploy);
	});

	await rest.put(Routes.applicationGuildCommands(guild.me.id, guild.id), {
		body: deploy,
	});
}
module.exports = setupGuild;