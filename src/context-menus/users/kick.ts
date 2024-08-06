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

	const reasonActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
		.addComponents(reasonInput);

	const kickModal = new ModalBuilder()
		.setCustomId('kickModal')
		.setTitle(`Kick ${target.tag}`)
		.addComponents(reasonActionRow);

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

	await kickHandler(modalSubmitInteraction, [target.id], reason);
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
