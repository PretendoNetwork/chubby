const Discord = require('discord.js');
const guildMemberRemoveHandler = require('./events/guildMemberRemove');
const guildMemberUpdateHandler = require('./events/guildMemberUpdate');
const interactionCreateHandler = require('./events/interactionCreate');
const messageCreateHandler = require('./events/messageCreate');
const messageDeleteHandler = require('./events/messageDelete');
const messageUpdateHandler = require('./events/messageUpdate');
const readyHandler = require('./events/ready');
const config = require('../config.json');

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES,
		Discord.Intents.FLAGS.GUILD_MEMBERS,
	]
});

client.commands = new Discord.Collection();

client.on('ready', readyHandler);
client.on('guildMemberRemove', guildMemberRemoveHandler);
client.on('guildMemberUpdate', guildMemberUpdateHandler);
client.on('interactionCreate', interactionCreateHandler);
client.on('messageCreate', messageCreateHandler);
client.on('messageDelete', messageDeleteHandler);
client.on('messageUpdate', messageUpdateHandler);

client.login(config.bot_token);