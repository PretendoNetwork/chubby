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
	
	const auditLogs = await guild.fetchAuditLogs({
		limit: 1
	});

	const eventLogEmbed = new Discord.MessageEmbed();

	eventLogEmbed.setColor(0xC0C0C0);
	eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setTitle('Event Type: _Member Left_'); // Default type
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

	const latestLog = auditLogs.entries.first();
	
	if (
		!latestLog || // no logs yet
		['MEMBER_KICK', 'MEMBER_BAN_ADD'].includes(latestLog.actionType) || // not the right type of log
		((Date.now() - latestLog.createdTimestamp) > 2000) // log is too old, older than a couple seconds ago
	) {
		// User probably just left on their own
		await util.sendEventLogMessage(guild, eventLogEmbed);
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
		await util.sendEventLogMessage(guild, eventLogEmbed);
		return;
	}
	
	if (latestLog.action === 'MEMBER_KICK') {
		eventLogEmbed.setColor(0xEF7F31);
		eventLogEmbed.setTitle('Event Type: _Member Kicked_');
	} else {
		eventLogEmbed.setColor(0xF24E43);
		eventLogEmbed.setTitle('Event Type: _Member Banned_');
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
			name: 'Executor',
			value: `<@${executor.id}>`
		},
		{
			name: 'Executor User ID',
			value: executor.id
		},
		{
			name: 'Reason',
			value: latestLog.reason
		},
		{
			name: 'From bot command',
			value: 'false'
		}
	);

	await util.sendEventLogMessage(guild, eventLogEmbed);
}

module.exports = guildMemberRemoveHandler;