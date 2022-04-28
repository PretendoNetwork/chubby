// eslint-disable-next-line
const Discord = require('discord.js'); // Disable ESLint since this is used only for JSDoc
const commandHandler = require('./command-handler');

/**
 * 
 * @param {Discord.Interaction} interaction
 */
async function interactionHander(interaction) {
	if (interaction.isCommand()) {
		await commandHandler(interaction);
	}
}

module.exports = interactionHander;