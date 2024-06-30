const Discord = require('discord.js');
const db = require('../db');
const util = require('../util');

/**
 *
 * @param {Discord.ThreadChannel} oldThread
 * @param {Discord.ThreadChannel} newThread
 */
async function threadUpdateHandler(oldThread, newThread) {
	const guild = await newThread.guild.fetch();

	const matchmakingChannelId = db.getDB().get('channels.matchmaking');
	if (!matchmakingChannelId) {
		console.log('Missing matchmaking channel!');
		return;
	}

	if (newThread.parentId !== matchmakingChannelId) {
		return;
	}

	if (!oldThread.archived && newThread.archived) {
		const eventLogEmbed = new Discord.MessageEmbed();
		eventLogEmbed.setColor(0x6060ff);
		eventLogEmbed.setTitle('Event Type: _Matchmaking Thread Archived_');
		eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
		eventLogEmbed.setFields(
			{
				name: 'Thread',
				value: `<#${newThread.id}>`,
			},
			{
				name: 'Thread ID',
				value: newThread.id,
			},
			{
				name: 'Creator',
				value: `<@${newThread.ownerId}>`,
			},
			{
				name: 'Members',
				value: newThread.memberCount.toString(),
			},
			{
				name: 'Created at',
				value: newThread.createdAt.toLocaleString(),
			},
			{
				name: 'Archived at',
				value: newThread.archivedAt.toLocaleString(),
			}
		);
		eventLogEmbed.setFooter({
			text: 'Pretendo Network',
			iconURL: guild.iconURL(),
		});

		await util.sendEventLogMessage(guild, newThread.parentId, eventLogEmbed);

		await newThread.setArchived(false);
		await newThread.setLocked(true, 'Automatic lock of inactive matchmaking thread');
		await newThread.setArchived(true);
	}
}

module.exports = threadUpdateHandler;
