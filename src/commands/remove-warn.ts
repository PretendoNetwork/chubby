import { SlashCommandBuilder } from '@discordjs/builders';
import { Warning } from '@/models/warnings';
import type { ChatInputCommandInteraction } from 'discord.js';

export async function removeWarnCommandHandler(interaction: ChatInputCommandInteraction): Promise<void> {
	const warnId = interaction.options.getString('id', true);

	await interaction.deferReply({
		ephemeral: true
	});

	const warning = await Warning.findOne({
		where: {
			id: Number(warnId)
		}
	});

	if (!warning) {
		await interaction.followUp({ content: 'Could not find warning', ephemeral: true });
		return;
	}

	const [affectedUpdates] = await Warning.update({
		expires_at: new Date()
	}, {
		where: {
			id: Number(warnId)
		}
	});
	if (affectedUpdates < 1) {
		await interaction.followUp({ content: 'Failed to remove warning', ephemeral: true });
		return;
	}

	await interaction.followUp({ content: 'Successfully removed warning', ephemeral: true });
}

const command = new SlashCommandBuilder()
	.setDefaultMemberPermissions('0')
	.setName('remove-warn')
	.setDescription('Remove a warn')
	.addStringOption((option) => {
		return option.setName('id')
			.setDescription('ID of the warn to remove')
			.setRequired(true);
	});

export default {
	name: command.name,
	handler: removeWarnCommandHandler,
	deploy: command.toJSON()
};
