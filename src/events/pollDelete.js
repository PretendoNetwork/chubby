const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.Message} message
 */
async function pollDeleteHandler(message) {
	const guild = await message.guild.fetch();
	const member = await message.member.fetch();
	const user = member.user;

	const eventLogEmbed = new Discord.MessageEmbed();
	const pollDeleteImage = new Discord.MessageAttachment('./src/images/events/event-delete.png');

	eventLogEmbed.setAuthor({
		name: user.tag,
		iconURL: user.avatarURL()
	});
	eventLogEmbed.setColor(0xff6363);

	eventLogEmbed.setTitle('_Poll Delete_');
	eventLogEmbed.setDescription(`${user.username}'s poll in ${message.channel.name} has been deleted`);

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
			value: 'CONTENT UNAVAILABLE'
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()
	});
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setThumbnail('attachment://event-delete.png');

	await util.sendEventLogMessage('channels.event-logs', guild, message.channelId, eventLogEmbed, pollDeleteImage, null);

}

module.exports = pollDeleteHandler;
