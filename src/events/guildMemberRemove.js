// eslint-disable-next-line
const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.GuildMember} member
 */
async function guildMemberRemoveHandler(member) {
	const guild = member.guild;
	const user = member.user;

	let image;
	
	const auditLogs = await guild.fetchAuditLogs({
		limit: 1
	});

	const eventLogEmbed = new Discord.MessageEmbed();
		eventLogEmbed.setAuthor({
			name: user.tag,
			iconURL: user.avatarURL()
		});
	eventLogEmbed.setColor(0x878787);
	eventLogEmbed.setDescription(`${user.username} has left Pretendo`);
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setTitle('_Member Left_'); // Default type
	eventLogEmbed.setFields( // Default fields
		{
			name: 'User',
			value: `<@${user.id}>`
		},
		{
			name: 'User ID',
			value: user.id
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()
	});
	eventLogEmbed.setTimestamp(Date.now());

	const latestLog = auditLogs.entries.first();
	
	if (
		!latestLog || // no logs yet
		['MEMBER_KICK', 'MEMBER_BAN_ADD'].includes(latestLog.actionType) || // not the right type of log
		((Date.now() - latestLog.createdTimestamp) > 2000) // log is too old, older than a couple seconds ago
	) {
		// User probably just left on their own
		image = new Discord.MessageAttachment('./src/images/events/event-leave.png');
		eventLogEmbed.setThumbnail('attachment://event-leave.png');
		await util.sendEventLogMessage('channels.event-logs', guild, null, eventLogEmbed, image, null);
		return;
	}

	// User was either kicked or banned
	const { executor, target } = latestLog;

	if (executor.bot) {
		// Bot actions log themselves in the action handlers
		return;
	}

	if (target.id !== member.id) {
		// Log target does not match current user
		// Probably just left on their own
		await util.sendEventLogMessage('channels.event-logs', guild, null, eventLogEmbed);
		return;
	}
	
	if (latestLog.action === 'MEMBER_KICK') {
		eventLogEmbed.setColor(0xdd6c02);
		eventLogEmbed.setTitle('_Member Kicked_');
		eventLogEmbed.setDescription(`${user.username} has been kicked from Pretendo by ${executor.username}`);
		image = new Discord.MessageAttachment('./src/images/mod/mod-kick.png');
		eventLogEmbed.setThumbnail('attachment://mod-kick.png');
	} else {
		eventLogEmbed.setColor(0xa30000);
		eventLogEmbed.setTitle('_Member Banned_');
		eventLogEmbed.setDescription(`${user.username} has been banned from Pretendo by ${executor.username}`);
		image = new Discord.MessageAttachment('./src/images/mod/mod-ban.png');
		eventLogEmbed.setThumbnail('attachment://mod-ban.png');
	}

	// Incase of the reason being not filled
	if (latestLog.reason === null) {
		latestLog.reason = "*No Reason Given*";
	}
	
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
			name: 'From Bot',
			value: 'false'
		}
	);

	await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, image, null);
}

module.exports = guildMemberRemoveHandler;