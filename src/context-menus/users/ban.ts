import {
	ActionRowBuilder,
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { banHandler } from '@/commands/ban';
import type { UserContextMenuCommandInteraction, ModalActionRowComponentBuilder} from 'discord.js';

export async function banContextMenuHandler(interaction: UserContextMenuCommandInteraction): Promise<void> {
	const target = interaction.targetUser;

	const reasonInput = new TextInputBuilder()
		.setCustomId('banReason')
		.setLabel('Reason')
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const reasonActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
		.addComponents(reasonInput);

	const banModal = new ModalBuilder()
		.setCustomId('banModal')
		.setTitle(`Ban ${target.tag}`)
		.addComponents(reasonActionRow);

	await interaction.showModal(banModal);

	let modalSubmitInteraction;
	try {
		modalSubmitInteraction = await interaction.awaitModalSubmit({
			time: 5 * 60 * 1000,
			filter: modalSubmitInteraction =>
				modalSubmitInteraction.customId === 'banModal' &&
				modalSubmitInteraction.user.id === interaction.user.id
		});
	} catch {
		// * The user dismissed the modal or took too long to respond
		return;
	}

	const reason = modalSubmitInteraction.fields.getTextInputValue('banReason');

	await banHandler(modalSubmitInteraction, [target.id], reason);
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
