import { ADD_NSFW_EXEMPTION, handleAddNsfwExemption, handleRemoveNsfwExemption, REMOVE_NSFW_EXEMPTION } from '@/check-nsfw';
import type { ButtonInteraction } from 'discord.js';

export default async function buttonHandler(interaction: ButtonInteraction): Promise<void> {
	const { customId } = interaction;
	
	switch (customId) {
		case ADD_NSFW_EXEMPTION:
			await handleAddNsfwExemption(interaction);
			break;
		case REMOVE_NSFW_EXEMPTION:
			await handleRemoveNsfwExemption(interaction);
			break;
	}
}
