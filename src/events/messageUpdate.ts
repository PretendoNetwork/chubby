import { EmbedBuilder } from 'discord.js';
import { sendEventLogMessage } from '@/util';
import type { Message, PartialMessage } from 'discord.js';

export async function messageUpdateHandler(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
	if (oldMessage.partial || newMessage.partial) {
		// * This should never happen as we don't opt into partial structures
		// * but we need this to be here to convince the compiler that the rest is safe
		return;
	}

	if (newMessage.author.bot) {
		console.log('author is a bot?!');
		return;
	}

	if (oldMessage.content !== newMessage.content) {
		const guild = await newMessage.guild!.fetch();
		const member = await newMessage.member!.fetch();
		const user = member.user;

		const oldMessageContent = oldMessage.content.length > 1024 ? oldMessage.content.substring(0, 1023) + '…' : oldMessage.content;
		const newMessageContent = newMessage.content.length > 1024 ? newMessage.content.substring(0, 1023) + '…' : newMessage.content;
		const channel = newMessage.channel;
	
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
				value: user.id
			},
			{
				name: 'Channel Tag',
				value: `<#${newMessage.channelId}>`
			},
			{
				name: 'Channel Name',
				value: (channel as any).name // TODO some better way of doing this?
			},
			{
				name: 'Old Message',
				value: oldMessageContent,
				inline: true
			},
			{
				name: 'New Message',
				value: newMessageContent,
				inline: true
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL()!
		});

		await sendEventLogMessage(guild, newMessage.channelId, eventLogEmbed);
	}
}
