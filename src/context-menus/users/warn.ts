import {
	ActionRowBuilder,
	ApplicationCommandType,
	ContextMenuCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { warnHandler } from '@/commands/warn';
import type { UserContextMenuCommandInteraction, ModalActionRowComponentBuilder} from 'discord.js';

export async function warnContextMenuHandler(interaction: UserContextMenuCommandInteraction): Promise<void> {
	const target = interaction.targetUser;

	const reasonInput = new TextInputBuilder()
		.setCustomId('warnReason')
		.setLabel('Reason')
		.setRequired(true)
		.setStyle(TextInputStyle.Short);

	const reasonActionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
		.addComponents(reasonInput);

	const warnModal = new ModalBuilder()
		.setCustomId('warnModal')
		.setTitle(`Warn ${target.tag}`)
		.addComponents(reasonActionRow);

	await interaction.showModal(warnModal);

	let modalSubmitInteraction;
	try {
		// * Interaction tokens are only valid for 15 minutes, leave some time for warn processing
		modalSubmitInteraction = await interaction.awaitModalSubmit({
			time: 14.5 * 60 * 1000,
			filter: modalSubmitInteraction =>
				modalSubmitInteraction.customId === 'warnModal' &&
				modalSubmitInteraction.user.id === interaction.user.id
		});
	} catch {
		// * The user dismissed the modal or took too long to respond
		return;
	}

	const reason = modalSubmitInteraction.fields.getTextInputValue('warnReason');

	await warnHandler(modalSubmitInteraction, [target.id], reason);
}

const warnContextMenu = new ContextMenuCommandBuilder()
	.setName('Warn user')
	.setDefaultMemberPermissions('0')
	.setType(ApplicationCommandType.User);

export default {
	name: warnContextMenu.name,
	handler: warnContextMenuHandler,
	deploy: warnContextMenu.toJSON()
};
