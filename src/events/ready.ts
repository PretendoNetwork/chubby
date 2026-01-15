import { scheduleJob } from 'node-schedule';
import { PresenceUpdateStatus, ActivityType } from 'discord.js';
import { setupGuild } from '@/setup-guild';
import banCommand from '@/commands/ban';
import kickCommand from '@/commands/kick';
import settingsCommand from '@/commands/settings';
import warnCommand from '@/commands/warn';
import modpingCommand from '@/commands/modping';
import removeWarnCommand from '@/commands/remove-warn';
import listWarnsCommand from '@/commands/list-warns';
import slowModeCommand from '@/commands/slow-mode';
import messageLogContextMenu from '@/context-menus/messages/message-log';
import warnContextMenu from '@/context-menus/users/warn';
import kickContextMenu from '@/context-menus/users/kick';
import banContextMenu from '@/context-menus/users/ban';
import { checkMatchmakingThreads } from '@/matchmaking-threads';
import { SlowMode } from '@/models/slow-mode';
import handleSlowMode from '@/slow-mode';
import type { Client } from 'discord.js';

export async function readyHandler(client: Client): Promise<void> {
	console.log('Registering global commands');
	loadBotHandlersCollection(client);

	console.log('Setting up guilds');
	const guilds = await client.guilds.fetch();
	for (const id of guilds.keys()) {
		const guild = await guilds.get(id)!.fetch();
		await setupGuild(guild);
	}

	scheduleJob('*/10 * * * *', async () => {
		await checkMatchmakingThreads();
	});

	console.log(`Logged in as ${client.user!.tag}!`);

	client?.user?.setPresence({ activities: [{ name: '#modmail for moderation concerns', type: ActivityType.Listening }], status: PresenceUpdateStatus.Online });

	await checkMatchmakingThreads();

	await setupSlowMode(client);
}

function loadBotHandlersCollection(client: Client): void {
	client.commands.set(banCommand.name, banCommand);
	client.commands.set(kickCommand.name, kickCommand);
	client.commands.set(settingsCommand.name, settingsCommand);
	client.commands.set(warnCommand.name, warnCommand);
	client.commands.set(modpingCommand.name, modpingCommand);
	client.commands.set(slowModeCommand.name, slowModeCommand);
	client.commands.set(removeWarnCommand.name, removeWarnCommand);
	client.commands.set(listWarnsCommand.name, listWarnsCommand);

	client.contextMenus.set(messageLogContextMenu.name, messageLogContextMenu);
	client.contextMenus.set(warnContextMenu.name, warnContextMenu);
	client.contextMenus.set(kickContextMenu.name, kickContextMenu);
	client.contextMenus.set(banContextMenu.name, banContextMenu);
}

async function setupSlowMode(client: Client): Promise<void> {
	const slowModes = await SlowMode.findAll({
		where: {
			enabled: true
		},
		include: { all: true }
	});

	slowModes.forEach(slowMode => handleSlowMode(client, slowMode));
}
