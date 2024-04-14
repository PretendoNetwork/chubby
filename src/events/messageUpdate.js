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

		// Jump button
		const row = new Discord.MessageActionRow();
		row.addComponents(
			new Discord.MessageButton()
				.setLabel('Jump!')
				.setStyle('LINK')
				.setURL(newMessage.url)
				.setEmoji('📨'),
		);
		
		const eventLogEmbed = new Discord.MessageEmbed();
		const msgUpdateImage = new Discord.MessageAttachment('./src/images/events/event-update.png');

		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
		eventLogEmbed.setColor(0xffefb6);
		eventLogEmbed.setTitle('_Message Update_');
		eventLogEmbed.setDescription(`${user.username} has updated their message in ${newMessage.channel.name}`);
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
				value: `<#${newMessage.channelId}>`
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
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setThumbnail('attachment://event-update.png');

		await util.sendEventLogMessage('channels.event-logs', guild, newMessage.channelId, eventLogEmbed, msgUpdateImage, row);
	}
	
}

module.exports = messageUpdateHandler;