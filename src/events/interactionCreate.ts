import buttonHandler from '@/handlers/button-handler';
import commandHandler from '@/handlers/command-handler';
import type { Interaction } from 'discord.js'; 

export default async function interactionCreateHandler(interaction: Interaction): Promise<void> {
	try {
		if (interaction.isCommand()) {
			await commandHandler(interaction);
		} else if (interaction.isButton()) {
			await buttonHandler(interaction);
		}
	} catch (error: any) {
		if (!interaction.isCommand()) {
			return;
		}

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
