const Discord = require('discord.js');

const db = require('./db');
const util = require('./util');
const MatchmakingThreads = require('./models/matchmakingThreads');

/**
 *
 * @param {Discord.Client} client
 */
async function checkMatchmakingThreads(client) {
	let matchmakingLockTimeout = parseInt(db.getDB().get('matchmaking.lock-timeout-seconds'));
	if (!matchmakingLockTimeout) {
		console.log('Missing matchmaking lock timeout! Defaulting to 1 hour.');
		matchmakingLockTimeout = 60 * 60;
	}

	const now = Date.now();
	const matchmakingThreads = await MatchmakingThreads.findAll();

	for (const thread of matchmakingThreads) {
		let threadChannel;
		try {
			threadChannel = await client.channels.fetch(thread.id);
		} catch (err) {
			console.log(`Error fetching matchmaking thread channel: ${err}`);
			threadChannel = null;
		}

		if (!threadChannel || threadChannel.type !== 'GUILD_PUBLIC_THREAD') {
			// Thread is either deleted or not a public thread, which should not happen
			console.log(`Removing deleted or invalid matchmaking thread from database: ${thread.id}`);
			await MatchmakingThreads.destroy({ where: { id: thread.id } });
			continue;
		}

		const lastMessageSent = new Date(thread.lastMessageSent).getTime();
		const timeSinceLastMessage = now - lastMessageSent;

		if (timeSinceLastMessage > matchmakingLockTimeout * 1000) {
			if (!threadChannel.archived && !threadChannel.locked) {
				// Only send an inactivity message if the thread is not already archived/locked by moderators
				await threadChannel.send('Thread locked due to inactivity.');
			}

			if (threadChannel.archived) {
				// Cannot lock an archived thread, so we need to unarchive it first
				await threadChannel.setArchived(false);
			}
			await threadChannel.setLocked(true);
			await threadChannel.setArchived(true, 'Automatic lock of inactive matchmaking thread.');
			await MatchmakingThreads.destroy({ where: { id: thread.id } });

			const guild = await threadChannel.guild.fetch();
			const eventLogEmbed = new Discord.MessageEmbed();
			eventLogEmbed.setColor(0x6060ff);
			eventLogEmbed.setTitle('Event Type: _Matchmaking Thread Locked_');
			eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
			eventLogEmbed.setFields(
				{
					name: 'Thread',
					value: `<#${threadChannel.id}>`,
				},
				{
					name: 'Thread ID',
					value: threadChannel.id,
				},
				{
					name: 'Creator',
					value: `<@${threadChannel.ownerId}>`,
				},
				{
					name: 'Members',
					value: threadChannel.memberCount.toString(),
				},
				{
					name: 'Created at',
					value: threadChannel.createdAt.toLocaleString(),
				},
				{
					name: 'Archived at',
					value: threadChannel.archivedAt.toLocaleString(),
				}
			);
			eventLogEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL(),
			});
			await util.sendEventLogMessage(guild, thread.parentId, eventLogEmbed);
		}
	}
}

module.exports = checkMatchmakingThreads;
