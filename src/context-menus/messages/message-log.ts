import { ApplicationCommandType, ChannelType, ContextMenuCommandBuilder } from 'discord.js';
import { MessageAuditRelationship } from '@/models/messageAuditRelationship';
import { getChannelFromSettings } from '@/util';
import type { MessageContextMenuCommandInteraction } from 'discord.js';

async function messageLogMenuHandler(interaction: MessageContextMenuCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });

	const messageAuditRelationships = await MessageAuditRelationship.findAll({
		where: {
			message_id: interaction.targetMessage.id
		}
	});

	if (messageAuditRelationships.length > 0) {
		const auditLogChannel = await getChannelFromSettings(interaction.guild!, 'event-logs');
		if (!auditLogChannel || auditLogChannel.type !== ChannelType.GuildText) {
			console.error('no log channel specified');
			return;
		}

		let message = `Log events for message ${interaction.targetMessage.url}`;
		message += '\n> ';
		message += interaction.targetMessage.content.substring(0, 1024);
		if (interaction.targetMessage.content.length > 1024) {
			message += '…';
		}
		message += '\n\n';
		for (const relationship of messageAuditRelationships) {
			const logEvent = await auditLogChannel.messages.fetch(relationship.log_event_id);
			message += '- ';
			message += logEvent.url;
			message += '\n';
		}

		await interaction.followUp({ content: message });
	} else {
		await interaction.followUp({ content: 'No audit logs found for this message' });
	}
}

const messageLogContextMenu = new ContextMenuCommandBuilder()
	.setName('Message events')
	.setDefaultMemberPermissions('0')
	.setType(ApplicationCommandType.Message);

export default {
	name: 'Message events',
	handler: messageLogMenuHandler,
	deploy: messageLogContextMenu.toJSON()
};
