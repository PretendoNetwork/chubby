const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.GuildMember} member
 */
async function guildMemberAddHandler(member) {
    const guild = member.guild;
    const user = member.user;

	const eventLogEmbed = new Discord.MessageEmbed();
	const image = new Discord.MessageAttachment('./src/images/events/event-join.png');

    eventLogEmbed.setAuthor({
		name: user.tag,
		iconURL: user.avatarURL()
	});
	eventLogEmbed.setColor(0x97fdb9);
	eventLogEmbed.setTitle('_Member Joined_');
	eventLogEmbed.setDescription(`${user.username} has joined Pretendo`);
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
			name: 'Account Creation Date (UTC)',
			value: user.createdAt.toUTCString()
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()
	});
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setThumbnail('attachment://event-join.png');

	await util.sendEventLogMessage('channels.event-logs', guild, null, eventLogEmbed, image, null);
}
module.exports = guildMemberAddHandler;