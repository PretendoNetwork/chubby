import { PermissionFlagsBits } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import handleSlowMode from '@/slow-mode';
import { SlowMode } from '@/models/slow-mode';
import { bot_token as botToken } from '@/config.json';
import type { Guild } from 'discord.js';

const rest = new REST({ version: '10' }).setToken(botToken);

export async function setupGuild(guild: Guild): Promise<void> {
	// * Do nothing if the bot does not have the correct permissions
	if (!guild.members.me!.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
		console.log('Bot does not have permissions to set up in guild', guild.name);
		return;
	}

	// * Populate members cache
	await guild.members.fetch();

	// * Setup commands
	await deployCommands(guild);

	// * Setup slow mode
	await setupSlowMode(guild);
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

async function setupSlowMode(guild: Guild): Promise<void> {
	const slowModes = await SlowMode.findAll({
		where: {
			enabled: true
		},
		include: { all: true }
	});

	slowModes.forEach(slowMode => handleSlowMode(guild, slowMode));
}