import { scheduleJob } from 'node-schedule';
import { setupGuild } from '@/setup-guild';
import { sequelize } from '@/sequelize-instance';
import banCommand from '@/commands/ban';
import kickCommand from '@/commands/kick';
import settingsCommand from '@/commands/settings';
import warnCommand from '@/commands/warn';
import { checkMatchmakingThreads } from '@/matchmaking-threads';
import { loadModel } from '@/check-nsfw';
import type { Database } from 'sqlite3';
import type { Client, Collection } from 'discord.js';
import type { ClientCommand } from '@/types';
import config from '@/config.json';

export default async function readyHandler(client: Client): Promise<void> {
	console.log('Registering global commands');
	loadBotHandlersCollection('commands', client.commands);

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
}

function loadBotHandlersCollection(name: string, collection: Collection<string, ClientCommand>): void {
	collection.set(banCommand.name, banCommand);
	collection.set(kickCommand.name, kickCommand);
	collection.set(settingsCommand.name, settingsCommand);
	collection.set(warnCommand.name, warnCommand);
}
