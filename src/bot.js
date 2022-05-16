const Discord = require('discord.js');
const setupGuild = require('./setup-guild');
const messageCreateHandler = require('./events/messageCreate');
const interactionCreateHandler = require('./events/interactionCreate');
const sequelize = require('./sequelize');
const config = require('../config.json');

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES
	]
});

client.on('ready', async () => {
	await sequelize.sync(config.sequelize);

	const guilds = await client.guilds.fetch();

	for (let guild of guilds) {
		guild = await guild[1].fetch();
		setupGuild(guild);
	}

	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', messageCreateHandler);
client.on('interactionCreate', interactionCreateHandler);

client.login(config.bot_token);