import { PermissionFlagsBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { bot_token as botToken } from '@/config.json';
import type { Guild } from 'discord.js';

const rest = new REST({ version: '10' }).setToken(botToken);

export async function setupGuild(guild: Guild): Promise<void> {
	// do nothing if the bot does not have the correct permissions
	if (!guild.members.me!.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
		console.log('Bot does not have permissions to set up in guild', guild.name);
		return;
	}

	// Populate members cache
	await guild.members.fetch();

	// Setup commands
	await deployCommands(guild);
}

async function deployCommands(guild: Guild): Promise<void> {

	const commands = guild.client.commands.map((command) => {
		return command.deploy;
	});

	const contextMenus = guild.client.contextMenus.map((contextMenu) => {
		return contextMenu.deploy;
	});

	await rest.put(Routes.applicationGuildCommands(guild.members.me!.id, guild.id), {
		body: [...commands, ...contextMenus],
	});
}