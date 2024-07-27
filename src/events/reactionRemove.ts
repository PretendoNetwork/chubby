import { BaseGuildTextChannel, ChannelType, EmbedBuilder, GuildEmoji } from 'discord.js';
import { MessageAuditRelationship } from '@/models/messageAuditRelationship';
import { getChannelFromSettings, sendEventLogMessage } from '@/util';
import type { Message, MessageReaction, PartialMessageReaction, PartialUser, ThreadChannel, User } from 'discord.js';

export default async function reactionRemoveHandler(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
	if (reaction.partial === true) {
		reaction = await reaction.fetch();
	}

	if (reaction.message.partial === true) {
		reaction.message = await reaction.message.fetch();
	}

	const messageAuditRelationship = await MessageAuditRelationship.findOne({
		where: {
			message_id: reaction.message.id
		},
		order: [['created', 'desc']]
	});

	let message = `${reaction.emoji.name} removed by <@${user.id}>`;
	if (reaction.emoji.imageURL()) {
		if (reaction.emoji instanceof GuildEmoji) {
			message = `<:${reaction.emoji.identifier}> removed by <@${user.id}>`;
		} else {
			message = `[:${reaction.emoji.name}:](${reaction.emoji.imageURL()}?size=44&quality=lossless) removed by <@${user.id}>`;
		}
	}

	if (!messageAuditRelationship) {
		const embed = createEmbed(reaction, reaction.message);

		const audit = await sendEventLogMessage(reaction.message.guild!, reaction.message.channelId, embed);
		if (!audit) {
			return;
		}

		await MessageAuditRelationship.create({ 
			message_id: reaction.message.id,
			log_event_id: audit.id
		});

		const thread = await createThread(audit);
		await thread.send({
			content: message,
			allowedMentions: {
				parse: []
			}
		});
		await thread.setArchived(true);
	} else {
		const auditLogChannel = await getChannelFromSettings(reaction.message.guild!, 'channels.event-logs');
		if (!auditLogChannel || auditLogChannel.type !== ChannelType.GuildText) {
			console.error('no log channel specified');
			return;
		}

		const auditMessage = await auditLogChannel.messages.fetch(messageAuditRelationship.log_event_id);
		if (!auditMessage) {
			console.log('no log event found for message');
			return;
		}

		const thread = auditMessage.thread ?? await createThread(auditMessage);
		await thread.send({ 
			content: message,
			allowedMentions: { parse: [] }
		});
		await thread.setArchived(true);
	}
}

async function createThread(audit: Message): Promise<ThreadChannel> {
	return audit.startThread({ name: 'Reaction removal thread', reason: 'Thread for reaction removal' });
}

function createEmbed(reaction: MessageReaction, message: Message): EmbedBuilder {
	let channelName = 'No channel name found';
	if (reaction.message.channel instanceof BaseGuildTextChannel) {
		channelName = reaction.message.channel.name;
	}

	const embed = new EmbedBuilder()
		.setColor(0xC0C0C0)
		.setTitle('Event Type: _Reactions Removed_')
		.setDescription('――――――――――――――――――――――――――――――――――')
		.setFields([
			{
				name: 'User',
				value: `<@${reaction.message.author!.id}>`
			},
			{
				name: 'User ID',
				value: reaction.message.author!.id
			},
			{
				name: 'Channel Tag',
				value: `<#${reaction.message.channelId}>`
			},
			{
				name: 'Channel Name',
				value: channelName
			},
			{
				name: 'Message',
				value: reaction.message.url
			}
		])
		.setFooter({
			text: 'Pretendo Network',
			iconURL: reaction.message.guild!.iconURL()!
		});

	if (message.content.length > 0) {
		embed.addFields([
			{
				name: 'Message contents',
				value: message.content
			}
		]);
	}

	return embed;
}