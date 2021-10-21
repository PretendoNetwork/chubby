const Discord = require('discord.js');
const setupGuild = require('./setup-guild');
const messageHandler = require('./message-handler');
const config = require('../config.json');

const bot = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES] });

bot.on('ready', () => {
	bot.guilds.cache.forEach(setupGuild);

	console.log(`Logged in as ${bot.user.tag}!`);
});

bot.on('messageCreate', messageHandler);

bot.login(config.bot_token);