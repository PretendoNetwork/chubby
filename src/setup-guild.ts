import { Routes } from 'discord-api-types/v10';
import type { Guild, REST } from 'discord.js';

export async function setupGuild(guild: Guild, rest: REST): Promise<void> {
	// * Populate members cache
	await guild.members.fetch();

	try {
		// * Setup commands
		console.log(`- deploying commands for guild ${guild.id}`);
		await deployCommands(guild, rest);
	} catch (error) {
		console.error(`- failed to deploy commands for guild ${guild.id}:`, error);
	}
}

async function deployCommands(guild: Guild, rest: REST): Promise<void> {
	const commands = guild.client.commands.filter((c) => {
		return c.name !== 'user-info';
	}).map((command) => {
		return command.deploy;
	});

	const contextMenus = guild.client.contextMenus.map((contextMenu) => {
		return contextMenu.deploy;
	});

	await rest.put(Routes.applicationGuildCommands(guild.members.me!.id, guild.id), {
		body: [...commands, ...contextMenus]
	});
}
