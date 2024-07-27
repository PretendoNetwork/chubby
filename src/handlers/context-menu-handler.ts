import type { ContextMenuCommandInteraction } from 'discord.js';

export default async function messageContextMenuHandler(interaction: ContextMenuCommandInteraction): Promise<void> {
	const { commandName } = interaction;

	const contextMenus = interaction.client.contextMenus;
	const contextMenu = contextMenus.get(commandName);

	// do nothing if no context menu
	if (!contextMenu) {
		throw new Error(`Missing command handler for \`${commandName}\``);
	}

	// run the context menu
	await contextMenu.handler(interaction);
}