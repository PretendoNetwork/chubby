import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import guildAuditLogEntryCreateHandler from '@/events/guildAuditLogEntryCreate';
import guildMemberRemoveHandler from '@/events/guildMemberRemove';
import interactionCreateHandler from '@/events/interactionCreate';
import messageCreateHandler from '@/events/messageCreate';
import messageDeleteHandler from '@/events/messageDelete';
import messageUpdateHandler from '@/events/messageUpdate';
import readyHandler from '@/events/ready';
import config from '@/config.json';
import type { ClientCommand } from '@/types';

export const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration
	]
});

client.commands = new Collection<string, ClientCommand>();

client.on(Events.ClientReady, readyHandler);
client.on(Events.GuildMemberRemove, guildMemberRemoveHandler);
client.on(Events.InteractionCreate, interactionCreateHandler);
client.on(Events.MessageCreate, messageCreateHandler);
client.on(Events.MessageDelete, messageDeleteHandler);
client.on(Events.MessageUpdate, messageUpdateHandler);
client.on(Events.GuildAuditLogEntryCreate, guildAuditLogEntryCreateHandler);

client.login(config.bot_token);
