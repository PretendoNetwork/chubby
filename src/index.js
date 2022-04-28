const Discord = require('discord.js');
const setupGuild = require('./setup-guild');
const messageHandler = require('./message-handler');
const interactionHandler = require('./interaction-handler');
const { sequelize } = require('./database');
const config = require('../config.json');

const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES
	]
});

client.on('ready', async () => {
	await sequelize.sync({ force: config.sequelize_force, alter: true });

	const guilds = await client.guilds.fetch();

	for (let guild of guilds) {
		guild = await guild[1].fetch();
		setupGuild(guild);
	}

	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', messageHandler);
client.on('interactionCreate', interactionHandler);

client.login(config.bot_token);