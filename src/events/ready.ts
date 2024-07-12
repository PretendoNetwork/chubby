import { setupGuild } from '@/setup-guild';
import { sequelize } from '@/sequelize-instance';
import config from '@/config.json';
import banCommand from '@/commands/ban';
import kickCommand from '@/commands/kick';
import settingsCommand from '@/commands/settings';
import warnCommand from '@/commands/warn';
import type { Client, Collection } from 'discord.js';

export async function readyHandler(client: Client): Promise<void> {
	loadBotHandlersCollection('commands', client.commands);
	console.log('Registered global commands');

	await sequelize.sync(config.sequelize);

	const guilds = await client.guilds.fetch();

	for (const id of guilds.keys()) {
		const guild = await guilds.get(id)!.fetch();
		await setupGuild(guild);
	}

	console.log(`Logged in as ${client.user!.tag}!`);
}

function loadBotHandlersCollection(name: string, collection: Collection<string, any>): void {
	collection.set(banCommand.name, banCommand);
	collection.set(kickCommand.name, kickCommand);
	collection.set(settingsCommand.name, settingsCommand);
	collection.set(warnCommand.name, warnCommand);
}
