const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.Message} oldMessage
 * @param {Discord.Message} newMessage
 */
async function messageUpdateHandler(oldMessage, newMessage) {
	if (newMessage.author.bot) return;

	if (oldMessage.content !== newMessage.content) {
		const guild = await newMessage.guild.fetch();
		const member = await newMessage.member.fetch();
		const user = member.user;

		const oldMessageContent = oldMessage.content.length > 1024 ? oldMessage.content.substr(0, 1023) + '…' : oldMessage.content;
		const newMessageContent = newMessage.content.length > 1024 ? newMessage.content.substr(0, 1023) + '…' : newMessage.content;
	
		const eventLogEmbed = new Discord.MessageEmbed();

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
				value: newMessage.channel.name
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
			iconURL: guild.iconURL()
		});

		await util.sendEventLogMessage(guild, eventLogEmbed);
	}
	
}

module.exports = messageUpdateHandler;