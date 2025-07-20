import commandHandler from '@/handlers/command-handler';
import messageContextMenuHandler from '@/handlers/context-menu-handler';
import type { Interaction } from 'discord.js';

export default async function interactionCreateHandler(interaction: Interaction): Promise<void> {
	try {
		if (interaction.isChatInputCommand()) {
			await commandHandler(interaction);
		} else if (interaction.isContextMenuCommand()) {
			await messageContextMenuHandler(interaction);
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
				await interaction.followUp(payload);
			} else {
				await interaction.reply(payload);
			}
		} catch (replyError) {
			console.log(replyError, error);
		}
	}
}
