import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { guildMemberRemoveHandler } from '@/events/guildMemberRemove';
import { guildMemberUpdateHandler } from '@/events/guildMemberUpdate';
import { interactionCreateHandler } from '@/events/interactionCreate';
import { messageCreateHandler } from '@/events/messageCreate';
import { messageDeleteHandler } from '@/events/messageDelete';
import { messageUpdateHandler } from '@/events/messageUpdate';
import { readyHandler } from '@/events/ready';
import config from '@/config.json';

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers
	]
});

client.commands = new Collection<string, any>();

client.on('ready', readyHandler);
client.on('guildMemberRemove', guildMemberRemoveHandler);
client.on('guildMemberUpdate', guildMemberUpdateHandler);
client.on('interactionCreate', interactionCreateHandler);
client.on('messageCreate', messageCreateHandler);
client.on('messageDelete', messageDeleteHandler);
client.on('messageUpdate', messageUpdateHandler);

client.login(config.bot_token);