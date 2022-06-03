// eslint-disable-next-line
const Discord = require('discord.js'); // Disable ESLint since this is used only for JSDoc
const commandHandler = require('../handlers/command-handler');

/**
 * 
 * @param {Discord.Interaction} interaction
 */
async function interactionHander(interaction) {
	try {
		if (interaction.isCommand()) {
			await commandHandler(interaction);
		}
	} catch (error) {
		const payload = {
			content: error.message || 'Missing error message',
			ephemeral: true
		};

		try {
			if (interaction.replied || interaction.deferred) {
				await interaction.editReply(payload);
			} else {
				await interaction.reply(payload);
			}
		} catch (replyError) {
			console.log(replyError, error);
		}
	}
}

module.exports = interactionHander;