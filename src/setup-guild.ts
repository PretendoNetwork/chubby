import { Permissions } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';
import { bot_token as botToken } from '@/config.json';
import type { Guild } from 'discord.js';

const rest = new REST({ version: '10' }).setToken(botToken);

export async function setupGuild(guild: Guild): Promise<void> {
	// do nothing if the bot does not have the correct permissions
	if (!guild.me!.permissions.has([Permissions.FLAGS.MANAGE_ROLES, Permissions.FLAGS.MANAGE_CHANNELS])) {
		console.log('Bot does not have permissions to set up in guild', guild.name);
		return;
	}

	// Populate members cache
	await guild.members.fetch();

	// Setup commands
	await deployCommands(guild);
}

async function deployCommands(guild: Guild): Promise<void> {

	const deploy = guild.client.commands.map((command) => {
		return command.deploy;
	});

	await rest.put(Routes.applicationGuildCommands(guild.me!.id, guild.id), {
		body: deploy,
	});
}