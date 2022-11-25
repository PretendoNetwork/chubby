const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.Message} message
 */
async function messageDeleteHandler(message) {
	if (message.author.bot) return;

	const guild = await message.guild.fetch();
	const member = await message.member.fetch();
	const user = member.user;

	const messageContent = message.content.length > 1024 ? message.content.substr(0, 1023) + '…' : message.content;

	const eventLogEmbed = new Discord.MessageEmbed();
	const image = new Discord.MessageAttachment('./src/images/events/event-delete.png');

	eventLogEmbed.setAuthor({
		name: user.tag,
		iconURL: user.avatarURL()
	});
	eventLogEmbed.setColor(0xff6363);
	eventLogEmbed.setTitle('_Message Delete_');
	eventLogEmbed.setDescription(`${user.username}'s message in ${message.channel.name} has been deleted`);
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
			name: 'Channel',
			value: `<#${message.channelId}>`
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
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setThumbnail('attachment://event-delete.png');

	await util.sendEventLogMessage('channels.event-logs', guild, message.channelId, eventLogEmbed, image, null);
	
}

module.exports = messageDeleteHandler;