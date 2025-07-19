import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import config from '@/config';
import type { Guild } from 'discord.js';

const rest = new REST({ version: '10' }).setToken(config.bot_token);

export async function setupGuild(guild: Guild): Promise<void> {
	// * Populate members cache
	await guild.members.fetch();

	try {
		// * Setup commands
		await deployCommands(guild);
	} catch (error) {
		console.error(`Failed to deploy commands for guild ${guild.id}:`, error);
	}
}

async function deployCommands(guild: Guild): Promise<void> {
	const commands = guild.client.commands.map((command) => {
		return command.deploy;
	});

	const contextMenus = guild.client.contextMenus.map((contextMenu) => {
		return contextMenu.deploy;
	});

	await rest.put(Routes.applicationGuildCommands(guild.members.me!.id, guild.id), {
		body: [...commands, ...contextMenus]
	});
}
