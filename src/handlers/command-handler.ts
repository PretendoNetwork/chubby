import type { CommandInteraction } from 'discord.js';

export default async function commandHandler(interaction: CommandInteraction): Promise<void> {
	const { commandName } = interaction;

	const commands = interaction.client.commands;
	const command = commands.get(commandName);

	// * Do nothing if no command
	if (!command) {
		throw new Error(`Missing command handler for \`${commandName}\``);
	}

	// * Run the command
	await command.handler(interaction);
}
