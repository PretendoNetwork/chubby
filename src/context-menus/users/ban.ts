import {
	ActionRowBuilder,
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { banHandler } from '@/commands/ban';
import type { UserContextMenuCommandInteraction, ModalActionRowComponentBuilder } from 'discord.js';

export async function banContextMenuHandler(interaction: UserContextMenuCommandInteraction): Promise<void> {
	const target = interaction.targetUser;

	const reasonInput = new TextInputBuilder()
		.setCustomId('banReason')
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

	const banModal = new ModalBuilder()
		.setCustomId('banModal')
		.setTitle(`Ban ${target.tag}`)
		.addComponents(reasonActionRow, deleteMessagesActionRow);

	await interaction.showModal(banModal);

	let modalSubmitInteraction;
	try {
		// * Interaction tokens are only valid for 15 minutes, leave some time for ban processing
		modalSubmitInteraction = await interaction.awaitModalSubmit({
			time: 14.5 * 60 * 1000,
			filter: modalSubmitInteraction =>
				modalSubmitInteraction.customId === 'banModal' &&
				modalSubmitInteraction.user.id === interaction.user.id
		});
	} catch {
		// * The user dismissed the modal or took too long to respond
		return;
	}

	const reason = modalSubmitInteraction.fields.getTextInputValue('banReason');
	const deleteMessagesText = modalSubmitInteraction.fields.getTextInputValue('deleteMessages');
	const deleteMessages = parseFloat(deleteMessagesText) * 60 * 60 || null;

	if (deleteMessages && (deleteMessages < 0 || deleteMessages > 7 * 24 * 60 * 60)) {
		await modalSubmitInteraction.reply({
			content: 'Message deletion time must be between 0 and 168 hours (7 days).',
			ephemeral: true
		});
		return;
	}

	await banHandler(modalSubmitInteraction, [target.id], reason, deleteMessages);
}

const banContextMenu = new ContextMenuCommandBuilder()
	.setName('Ban user')
	.setDefaultMemberPermissions('0')
	.setType(ApplicationCommandType.User);

export default {
	name: banContextMenu.name,
	handler: banContextMenuHandler,
	deploy: banContextMenu.toJSON()
};
