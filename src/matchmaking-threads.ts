import { MatchmakingThread } from '@/models/matchmakingThreads';
import { sendEventLogMessage } from '@/util';
import { getDB } from './db';
import { ChannelType, EmbedBuilder } from 'discord.js';
import type { Client } from 'discord.js';

export async function checkMatchmakingThreads(client: Client): Promise<void> {
	let matchmakingLockTimeout = parseInt(getDB().get('matchmaking.lock-timeout-seconds') ?? '0');
	if (!matchmakingLockTimeout) {
		console.log('Missing matchmaking lock timeout! Defaulting to 1 hour.');
		matchmakingLockTimeout = 60 * 60;
	}

	const now = Date.now();
	const matchmakingThreads = await MatchmakingThread.findAll();

	for (const thread of matchmakingThreads) {
		let threadChannel;
		try {
			threadChannel = await client.channels.fetch(thread.thread_id);
		} catch (err) {
			console.log(`Error fetching matchmaking thread channel: ${err}`);
			threadChannel = null;
		}

		if (!threadChannel || threadChannel.type !== ChannelType.PublicThread) {
			// Thread is either deleted or not a public thread, which should not happen
			console.log(`Removing deleted or invalid matchmaking thread from database: ${thread.thread_id}`);
			await MatchmakingThread.destroy({ where: { thread_id: thread.thread_id } });
			continue;
		}

		const lastMessageSent = new Date(thread.last_message_sent).getTime();
		const timeSinceLastMessage = now - lastMessageSent;

		if (timeSinceLastMessage > matchmakingLockTimeout * 1000) {
			const guild = await threadChannel.guild.fetch();

			if (!threadChannel.archived && !threadChannel.locked) {
				// Only send an inactivity message if the thread has not already been closed/locked by moderators
				const inactivityEmbed = new EmbedBuilder();
				inactivityEmbed.setColor(0x6060ff);
				inactivityEmbed.setTitle('Matchmaking Thread Locked');
				inactivityEmbed.setDescription(
					'This matchmaking thread has been automatically locked due to inactivity.\n\nIf you want to play again, please just create a new thread here and ping whoever you want to add!'
				);
				inactivityEmbed.setFooter({
					text: 'Thanks for using Pretendo!',
					iconURL: guild.iconURL()!
				});
				await threadChannel.send({
					content: `Hi <@${threadChannel.ownerId}>!`,
					embeds: [inactivityEmbed]
				});
			}

			// Leave the thread unarchived so that the user can see the bot message
			await threadChannel.setArchived(false);
			await threadChannel.setLocked(true, 'Automatic lock of inactive matchmaking thread.');
			await MatchmakingThread.destroy({ where: { thread_id: thread.thread_id } });

			const eventLogEmbed = new EmbedBuilder();
			eventLogEmbed.setColor(0x6060ff);
			eventLogEmbed.setTitle('Event Type: _Matchmaking Thread Locked_');
			eventLogEmbed.setDescription('――――――――――――――――――――――――――――――――――');
			eventLogEmbed.setFields(
				{
					name: 'Thread',
					value: `<#${threadChannel.id}>`
				},
				{
					name: 'Thread ID',
					value: threadChannel.id
				},
				{
					name: 'Creator',
					value: `<@${threadChannel.ownerId}>`
				},
				{
					name: 'Members',
					value: threadChannel?.memberCount?.toString() ?? 'Unknown'
				},
				{
					name: 'Created at',
					value: threadChannel?.createdAt?.toLocaleString() ?? 'Unknown'
				},
				{
					name: 'Archived at',
					value: threadChannel?.archivedAt?.toLocaleString() ?? 'Unknown'
				}
			);
			eventLogEmbed.setFooter({
				text: 'Pretendo Network',
				iconURL: guild.iconURL()!
			});
			await sendEventLogMessage(guild, threadChannel.parentId, eventLogEmbed);
		}
	}
}
