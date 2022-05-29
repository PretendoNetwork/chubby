const Discord = require('discord.js');
const setupGuild = require('./setup-guild');
const guildMemberRemoveHandler = require('./events/guildMemberRemove');
const guildMemberUpdateHandler = require('./events/guildMemberUpdate');
const interactionCreateHandler = require('./events/interactionCreate');
const messageCreateHandler = require('./events/messageCreate');
const messageDeleteHandler = require('./events/messageDelete');
const messageUpdateHandler = require('./events/messageUpdate');
const sequelize = require('./sequelize');
const config = require('../config.json');

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES,
		Discord.Intents.FLAGS.GUILD_MEMBERS,
	]
});

client.on('ready', async () => {
	await sequelize.sync(config.sequelize);

	const guilds = await client.guilds.fetch();

	for (const id of guilds.keys()) {
		const guild = await guilds.get(id).fetch();
		
		await setupGuild(guild);
	}

	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('guildMemberRemove', guildMemberRemoveHandler);
client.on('guildMemberUpdate', guildMemberUpdateHandler);
client.on('interactionCreate', interactionCreateHandler);
client.on('messageCreate', messageCreateHandler);
client.on('messageDelete', messageDeleteHandler);
client.on('messageUpdate', messageUpdateHandler);


client.login(config.bot_token);