const Discord = require('discord.js');
const util = require('../util');

/**
 * 
 * @param {Discord.GuildBan} ban
 */
async function guildBanRemoveHandler(ban) {
	const guild = ban.guild;
	const user = ban.user;

	const auditLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: 'MEMBER_BAN_REMOVE'
	});

	const latestLog = auditLogs.entries.first();

	const { executor } = latestLog;

	const eventLogEmbed = new Discord.MessageEmbed();
	const pardonImage = new Discord.MessageAttachment('./src/images/mod/mod-pardon.png');

	eventLogEmbed.setAuthor({
		name: user.tag,
		iconURL: user.avatarURL()
	});
	eventLogEmbed.setColor(0xffffff);
	eventLogEmbed.setTitle('_Member Pardoned_');
	eventLogEmbed.setDescription(`${user.username} has been pardoned in Pretendo by ${executor.username}`);
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
			name: 'Moderator',
			value: `<@${executor.id}>`
		},
		{
			name: 'Moderator User ID',
			value: executor.id
		},
		{
			name: 'Type',
			value: 'Ban Pardon'
		},
		{
			name: 'From Bot',
			value: 'false'
		}
	);
	eventLogEmbed.setFooter({
		text: 'Pretendo Network',
		iconURL: guild.iconURL()
	});
	eventLogEmbed.setTimestamp(Date.now());
	eventLogEmbed.setThumbnail('attachment://mod-pardon.png');

	await util.sendEventLogMessage('channels.mod-logs', guild, null, eventLogEmbed, pardonImage, null);
}
module.exports = guildBanRemoveHandler;