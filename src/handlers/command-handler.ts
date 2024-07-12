import type { CommandInteraction } from 'discord.js';

export async function commandHandler(interaction: CommandInteraction): Promise<void> {
	const { commandName } = interaction;

	const commands = interaction.client.commands;
	const command = commands.get(commandName);

	// do nothing if no command
	if (!command) {
		throw new Error(`Missing command handler for \`${commandName}\``);
	}

	// run the command
	await command.handler(interaction);
}
