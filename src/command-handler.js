// eslint-disable-next-line
const Discord = require('discord.js'); // Disable ESLint since this is used only for JSDoc
const warnHandler = require('./commands/warn').handler;
const kickHandler = require('./commands/kick').handler;
const banHandler = require('./commands/ban').handler;

const commands = {
	warn: warnHandler,
	kick: kickHandler,
	ban: banHandler
};

/**
 * 
 * @param {Discord.Interaction} interaction
 */
async function commandHandler(interaction) {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	// do nothing if no command
	if (!commands[commandName]) {
		interaction.reply(`Missing command handler for \`${commandName}\``);
		return;
	}

	// run the command
	commands[commandName](interaction);
}

module.exports = commandHandler;