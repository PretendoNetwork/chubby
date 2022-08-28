const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.Message} message
 */
async function messageDeleteHandler(message) {
	if (message.author.bot) return;
	if (!message.member) return;

	const guild = await message.guild.fetch();
	const member = await message.member.fetch();
	const user = member.user;

	const messageContent = message.content.length > 1024 ? message.content.substr(0, 1023) + '…' : message.content;

	const eventLogEmbed = new Discord.MessageEmbed();

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
			value: message.channel.name
		},
		{
			name: 'Message',
			value: messageContent
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()
	});

	await util.sendEventLogMessage(guild, message.channelId, eventLogEmbed);
	
}

module.exports = messageDeleteHandler;