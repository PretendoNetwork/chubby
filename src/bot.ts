import { Client, GatewayIntentBits, Collection, Events, Partials, PresenceUpdateStatus, ActivityType } from 'discord.js';
import guildAuditLogEntryCreateHandler from '@/events/guildAuditLogEntryCreate';
import guildMemberRemoveHandler from '@/events/guildMemberRemove';
import guildMemberUpdateHandler from '@/events/guildMemberUpdate';
import presenceUpdateHandler from '@/events/presenceUpdate';
import interactionCreateHandler from '@/events/interactionCreate';
import messageCreateHandler from '@/events/messageCreate';
import messageDeleteHandler from '@/events/messageDelete';
import messageUpdateHandler from '@/events/messageUpdate';
import reactionRemoveHandler from '@/events/reactionRemove';
import { readyHandler } from '@/events/ready';
import config from '@/config';
import { sequelize } from '@/sequelize-instance';
import { initialiseSettings } from '@/models/settings';
import type { ClientContextMenu, ClientCommand } from '@/types';

process.on('SIGINT', () => {
	console.log('Exiting...');
	process.exit(0);
});

process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught exception:', error);
});

export const client = new Client({
	partials: [
		Partials.Reaction,
		Partials.Channel,
		Partials.Message
	],
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.DirectMessages
	],
	presence: { activities: [{ name: '#modmail for moderation concerns', type: ActivityType.Listening }], status: PresenceUpdateStatus.Online }
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

async function bootstrap(): Promise<void> {
	console.log('Establishing DB connection');
	await sequelize.sync(config.sequelize);
	await initialiseSettings();

	await client.login(config.bot_token);
}

bootstrap().catch(err => console.error(err));
