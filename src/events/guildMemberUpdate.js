const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.GuildMember} oldMember
 * @param {Discord.GuildMember} newMember
 */
async function guildMemberUpdateHandler(oldMember, newMember) {
	if (oldMember.user.bot) return;

	const member = newMember;
	const guild = member.guild;
	const user = member.user;

	const auditLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: 'MEMBER_UPDATE'
	});

	const latestLog = auditLogs.entries.first();

	const { executor } = latestLog;

	const eventLogEmbed = new Discord.MessageEmbed();

	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()
	});

	if (oldMember.communicationDisabledUntilTimestamp < newMember.communicationDisabledUntilTimestamp) {
		const memberUpdateImage = new Discord.MessageAttachment('./src/images/events/event-timedout.png');
		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
		eventLogEmbed.setColor(0xffb663);
		eventLogEmbed.setTitle('_Member Timedout_');
		eventLogEmbed.setDescription(`${user.username} has been timed out by ${executor.username}`);
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
				name: 'Moderator',
				value: `<@${executor.id}>`
			},
			{
				name: 'Moderator User ID',
				value: executor.id
			},
			{
				name: 'Reason',
				value: latestLog.reason
			},
			{
				name: 'Disabled Until (UTC)',
				value: newMember.communicationDisabledUntil.toUTCString()
			}
		);
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setThumbnail('attachment://event-timedout.png');

		await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, memberUpdateImage, null);
	}

	if (oldMember.nickname !== newMember.nickname) {
		const image = new Discord.MessageAttachment('./src/images/events/event-nick.png');
		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
		eventLogEmbed.setColor(0xb6d7ff);
		eventLogEmbed.setTitle('_Member Nickname Update_');
		eventLogEmbed.setDescription(`${oldMember.nickname || oldMember.user.username}'s nickname has been changed to ${newMember.nickname || oldMember.user.username}`);
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
				name: 'Executor',
				value: `<@${executor.id}>`
			},
			{
				name: 'Old Nickname',
				value: oldMember.nickname || oldMember.user.username + '(No Nickname)',
				inline: true
			},
			{
				name: 'New Nickname',
				value: newMember.nickname || oldMember.user.username + '(No Nickname)',
				inline: true
			}
		);
		eventLogEmbed.setTimestamp(Date.now());
		eventLogEmbed.setThumbnail('attachment://event-nick.png');

		await util.sendEventLogMessage('channels.event-logs', guild, null, eventLogEmbed, image, null);
	}
}

module.exports = guildMemberUpdateHandler;