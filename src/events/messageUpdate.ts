import { BaseGuildTextChannel, ChannelType, EmbedBuilder } from 'discord.js';
import { getChannelFromSettings, sendEventLogMessage } from '@/util';
import { MessageAuditRelationship } from '@/models/messageAuditRelationship';
import type { Message, PartialMessage } from 'discord.js';

export default async function messageUpdateHandler(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
	if (!newMessage.guildId || newMessage.author?.bot) {
		return;
	}

	if (oldMessage.partial) {
		oldMessage = await oldMessage.fetch();
	}

	if (newMessage.partial) {
		newMessage = await newMessage.fetch();
	}

	const guild = await newMessage.guild?.fetch();
	const member = await newMessage.member?.fetch();

	if (!guild || !member) {
		return;
	}

	if (oldMessage.content !== newMessage.content) {
		const user = member.user;

		const oldMessageContent = oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1023) + '…' : oldMessage.content;
		const newMessageContent = newMessage.content.length > 1024 ? newMessage.content.substring(0, 1023) + '…' : newMessage.content;

		let channelName = 'No channel name found';
		if (newMessage.channel instanceof BaseGuildTextChannel) {
			channelName = newMessage.channel.name;
		}

		const eventLogEmbed = new EmbedBuilder();

		eventLogEmbed.setColor(0xC0C0C0);
		eventLogEmbed.setTitle('Event Type: _Message Update_');
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setFields(
			{
				name: 'User',
				value: `<@${user.id}>`
			},
			{
				name: 'User ID',
				value: user.id || 'User ID not found'
			},
			{
				name: 'Channel Tag',
				value: `<#${newMessage.channelId}>`
			},
			{
				name: 'Channel Name',
				value: channelName || 'No channel name found'
			},
			{
				name: 'Old Message',
				value: oldMessageContent || '***Missing Content***',
				inline: true
			},
			{
				name: 'New Message',
				value: newMessageContent || '***Missing Content***',
				inline: true
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		const previousLogRelationship = await MessageAuditRelationship.findOne({
			where: {
				message_id: oldMessage.id
			},
			order: [['created', 'desc']]
		});

		if (previousLogRelationship) {
			const auditLogChannel = await getChannelFromSettings(guild, 'event-logs');
			if (auditLogChannel && auditLogChannel.type === ChannelType.GuildText) {
				const auditMessage = await auditLogChannel.messages.fetch(previousLogRelationship.log_event_id);
				if (auditMessage) {
					eventLogEmbed.addFields([
						{
							name: 'Previous audit event',
							value: auditMessage.url || 'No URL found'
						}
					]);
				}
			}
		}

		const audit = await sendEventLogMessage(guild, newMessage.channelId, eventLogEmbed);
		if (!audit) {
			return;
		}

		await MessageAuditRelationship.create({
			message_id: newMessage.id,
			log_event_id: audit.id
		});
	}
}
