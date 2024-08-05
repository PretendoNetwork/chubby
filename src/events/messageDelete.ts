import { AuditLogEvent, BaseGuildTextChannel, EmbedBuilder } from 'discord.js';
import { sendEventLogMessage, sendModLogMessage } from '@/util';
import type { Message, PartialMessage } from 'discord.js';

export default async function messageDeleteHandler(message: Message | PartialMessage): Promise<void> {
	if (message.partial) {
		return;
	}

	if (message.author.bot || !message.member) {
		return;
	}

	const guild = await message.guild!.fetch();

	let messageContent = message.content.length > 1024 ? message.content.substring(0, 1023) + '…' : message.content;
	if (messageContent === '') {
		messageContent = '\u200b';
	}

	let channelName = 'No channel name found';
	if (message.channel instanceof BaseGuildTextChannel) {
		channelName = message.channel.name;
	}

	// * Audit logs will not show up at the same time the message delete event
	await new Promise(resolve => setTimeout(resolve, 1000));

	const auditLogs = await guild.fetchAuditLogs({
		type: AuditLogEvent.MessageDelete,
		limit: 5
	});
	const auditLogEntry = auditLogs.entries.find(entry =>
		entry.target.id === message.author.id &&
		entry.extra.channel.id === message.channelId &&
		Date.now() - entry.createdTimestamp < 5 * 60 * 1000
	);
	// * This large time range is needed because message delete audit log entries are combined if multiple deletions are
	// * performed with the same target user, executor, and channel within 5 minutes. Decreasing this time range would
	// * create a risk of false negatives because the combined entry keeps the timestamp of the first deletion.
	// ! Edge case: If a user deletes their own message after a moderator deletes one of theirs within 5 minutes and in
	// ! the same channel, there will be a false positive mod log entry.

	const isDeletedByModerator = auditLogEntry !== undefined;

	const eventLogEmbed = new EmbedBuilder();

	eventLogEmbed.setColor(0xC0C0C0);
	eventLogEmbed.setTitle('Event Type: _Message Delete_');
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.addFields(
		{
			name: 'Author',
			value: `<@${message.author.id}>`
		},
		{
			name: 'Author ID',
			value: message.author.id
		});

	if (isDeletedByModerator) {
		const executor = auditLogEntry.executor;

		eventLogEmbed.addFields({
			name: 'Executor',
			value: executor ? `<@${executor.id}>` : 'Unknown'
		},
		{
			name: 'Executor ID',
			value: executor?.id ?? 'Unknown'
		});
	}

	eventLogEmbed.addFields({
		name: 'Channel Tag',
		value: `<#${message.channelId}>`
	},
	{
		name: 'Channel Name',
		value: channelName
	},
	{
		name: 'Message',
		value: messageContent
	});

	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()!
	});

	if (isDeletedByModerator) {
		await sendModLogMessage(guild, eventLogEmbed);
	} else {
		await sendEventLogMessage(guild, message.channelId, eventLogEmbed);
	}
}
