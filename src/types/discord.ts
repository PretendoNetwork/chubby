import type { Collection } from 'discord.js';
import type { ClientCommand, ClientContextMenu } from '.';

declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, ClientCommand>;
		contextMenus: Collection<string, ClientContextMenu>;
	}
}
