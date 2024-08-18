import { scheduleJob } from 'node-schedule';
import { setupGuild } from '@/setup-guild';
import { sequelize } from '@/sequelize-instance';
import banCommand from '@/commands/ban';
import kickCommand from '@/commands/kick';
import settingsCommand from '@/commands/settings';
import warnCommand from '@/commands/warn';
import modpingCommand from '@/commands/modping';
import messageLogContextMenu from '@/context-menus/messages/message-log';
import slowModeCommand from '@/commands/slow-mode';
import warnContextMenu from '@/context-menus/users/warn';
import kickContextMenu from '@/context-menus/users/kick';
import banContextMenu from '@/context-menus/users/ban';
import { checkMatchmakingThreads } from '@/matchmaking-threads';
import { loadModel } from '@/check-nsfw';
import { SlowMode } from '@/models/slow-mode';
import handleSlowMode from '@/slow-mode';
import config from '@/config';
import type { Database } from 'sqlite3';
import type { Client } from 'discord.js';

export default async function readyHandler(client: Client): Promise<void> {
	console.log('Registering global commands');
	loadBotHandlersCollection(client);

	console.log('Establishing DB connection');
	await sequelize.sync(config.sequelize);
	const connection = await sequelize.connectionManager.getConnection({ type: 'write' }) as Database;
	connection.loadExtension('./lib/phhammdist/phhammdist.so');

	console.log('Loading NSFWJS models');
	await loadModel();

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