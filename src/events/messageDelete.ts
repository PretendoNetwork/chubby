import { BaseGuildTextChannel, EmbedBuilder } from 'discord.js';
import { sendEventLogMessage } from '@/util';
import type { Message, PartialMessage } from 'discord.js';

export default async function messageDeleteHandler(message: Message | PartialMessage): Promise<void> {
	if (message.partial) {
		// * This should never happen as we don't opt into partial structures
		// * but we need this to be here to convince the compiler that the rest is safe
		return;
	}

	if (message.author.bot || !message.member) {
		return;
	}

	const guild = await message.guild!.fetch();
	const member = await message.member.fetch();
	const user = member.user;

	const messageContent = message.content.length > 1024 ? message.content.substring(0, 1023) + '…' : message.content;

	let channelName = 'No channel name found';
	if (message.channel instanceof BaseGuildTextChannel) {
		channelName = message.channel.name;
	}

	const eventLogEmbed = new EmbedBuilder();

	eventLogEmbed.setColor(0xC0C0C0);
	eventLogEmbed.setTitle('Event Type: _Message Delete_');
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setTimestamp(Date.now());
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
			name: 'Author',
			value: `<@${message.author.id}>`
		},
		{
			name: 'Author ID',
			value: message.author.id
		},
		{
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
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()!
	});

	await sendEventLogMessage(guild, message.channelId, eventLogEmbed);
}
