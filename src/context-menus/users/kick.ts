import {
	ActionRowBuilder,
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { kickHandler } from '@/commands/kick';
import type { UserContextMenuCommandInteraction, ModalActionRowComponentBuilder} from 'discord.js';

export async function kickContextMenuHandler(interaction: UserContextMenuCommandInteraction): Promise<void> {
	const target = interaction.targetUser;

	const reasonInput = new TextInputBuilder()
		.setCustomId('kickReason')
		.setLabel('Reason')
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const deleteMessagesInput = new TextInputBuilder()
		.setCustomId('deleteMessages')
		.setLabel('Delete recent message history (hours)')
		.setPlaceholder('Leave blank to not delete any messages')
		.setRequired(false)
		.setStyle(TextInputStyle.Short);

	const reasonActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
		.addComponents(reasonInput);

	const deleteMessagesActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
		.addComponents(deleteMessagesInput);

	const kickModal = new ModalBuilder()
		.setCustomId('kickModal')
		.setTitle(`Kick ${target.tag}`)
		.addComponents(reasonActionRow, deleteMessagesActionRow);

	await interaction.showModal(kickModal);

	let modalSubmitInteraction;
	try {
		modalSubmitInteraction = await interaction.awaitModalSubmit({
			time: 5 * 60 * 1000,
			filter: modalSubmitInteraction =>
				modalSubmitInteraction.customId === 'kickModal' &&
				modalSubmitInteraction.user.id === interaction.user.id
		});
	} catch {
		// * The user dismissed the modal or took too long to respond
		return;
	}

	const reason = modalSubmitInteraction.fields.getTextInputValue('kickReason');
	const deleteMessagesText = modalSubmitInteraction.fields.getTextInputValue('deleteMessages');
	const deleteMessages = parseFloat(deleteMessagesText) * 60 * 60 || null;

	if (deleteMessages && (deleteMessages < 0 || deleteMessages > 7 * 24 * 60 * 60)) {
		await modalSubmitInteraction.reply({
			content: 'Message deletion time must be between 0 and 168 hours (7 days).',
			ephemeral: true
		});
		return;
	}

	await kickHandler(modalSubmitInteraction, [target.id], reason, deleteMessages);
}

const kickContextMenu = new ContextMenuCommandBuilder()
	.setName('Kick user')
	.setDefaultMemberPermissions('0')
	.setType(ApplicationCommandType.User);

export default {
	name: kickContextMenu.name,
	handler: kickContextMenuHandler,
	deploy: kickContextMenu.toJSON()
};
