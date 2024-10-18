import { Client, GatewayIntentBits, Collection, Events, Partials } from 'discord.js';
import guildAuditLogEntryCreateHandler from '@/events/guildAuditLogEntryCreate';
import guildMemberRemoveHandler from '@/events/guildMemberRemove';
import guildMemberUpdateHandler from '@/events/guildMemberUpdate';
import presenceUpdateHandler from '@/events/presenceUpdate';
import interactionCreateHandler from '@/events/interactionCreate';
import messageCreateHandler from '@/events/messageCreate';
import messageDeleteHandler from '@/events/messageDelete';
import messageUpdateHandler from '@/events/messageUpdate';
import reactionRemoveHandler from '@/events/reactionRemove';
import readyHandler from '@/events/ready';
import config from '@/config';
import type { ClientContextMenu, ClientCommand } from '@/types';

process.on('SIGINT', () => {
	console.log('Exiting...');
	process.exit(0);
});

export const client = new Client({
	partials: [
		Partials.Reaction,
		Partials.Message
	],
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildPresences
	]
});

client.commands = new Collection<string, ClientCommand>();
client.contextMenus = new Collection<string, ClientContextMenu>();

client.on(Events.ClientReady, readyHandler);
client.on(Events.GuildMemberRemove, guildMemberRemoveHandler);
client.on(Events.GuildMemberUpdate, guildMemberUpdateHandler);
client.on(Events.PresenceUpdate, presenceUpdateHandler);
client.on(Events.InteractionCreate, interactionCreateHandler);
client.on(Events.MessageCreate, messageCreateHandler);
client.on(Events.MessageDelete, messageDeleteHandler);
client.on(Events.MessageUpdate, messageUpdateHandler);
client.on(Events.GuildAuditLogEntryCreate, guildAuditLogEntryCreateHandler);
client.on(Events.MessageReactionRemove, reactionRemoveHandler);

client.login(config.bot_token);
