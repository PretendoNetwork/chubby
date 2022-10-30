const Discord = require('discord.js');
const db = require('./db');

const ordinalRules = new Intl.PluralRules('en', {
	type: 'ordinal'
});

const suffixes = {
	one: 'st',
	two: 'nd',
	few: 'rd',
	other: 'th'
};

function ordinal(number) {
	const category = ordinalRules.select(number);
	const suffix = suffixes[category];
	return (number + suffix);
}

/**
 * 
 * @param {Discord.Guild} guild
 * @param {string|null} originId origin channel id
 * @param {Discord.MessageEmbed} embed
 */
async function sendEventLogMessage(guild, originId, embed) {
	const logChannelId = db.getDB().get('channels.event-logs');
	const logChannel = logChannelId && await guild.channels.fetch(logChannelId);
	const modLogChannelId = db.getDB().get('channels.mod-logs');
	const modLogChannel = logChannelId && await guild.channels.fetch(modLogChannelId);
	
	const blacklistedIds = db.getDBList('channels.event-logs.blacklist');
	if (blacklistedIds.includes(originId)) {
		return;
	}

	if (!logChannel) {
		console.log('Missing log channel!');
	} else {
		await logChannel.send({ embeds: [embed] });
	}
	if (!modLogChannel) {
		console.log('Missing mod log channel!');
	} else {
		await modLogChannel.send({ embeds: [embed] });
	}
}
async function sendModLogMessage(guild, originId, embed) {
	const modLogChannelId = db.getDB().get('channels.mod-logs');
	const modLogChannel = logChannelId && await guild.channels.fetch(modLogChannelId);

	if (!modLogChannel) {
		console.log('Missing mod log channel!');
	} else {
		await modLogChannel.send({ embeds: [embed] });
	}
}

module.exports = {
	ordinal,
	sendEventLogMessage,
	sendModLogMessage
};
