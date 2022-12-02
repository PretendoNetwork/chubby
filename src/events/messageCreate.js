const Discord = require('discord.js');
// NSFW Vars
const checkNSFW = require('../check-nsfw');
const urlRegex = /(https?:\/\/[^\s]+)/g;
// Misc. Vars
const reduxRegex = /\bredux{1,}\b/gi;
const rawrRegex = /\brawr{1,}\b/gi;
const fourRegex = /\b2014{1,}\b/gi;
const linuxRegex = /\blinux{1,}\b/gi;
const chubbyRegex = /\bchubby{1,}\b/gi;

/**
 *
 * @param {Discord.Message} message
 */
async function messageHandler(message) {
	// Ignore bot messages
	if (message.author.bot) return;

	// check if the message has any URLs
	const urls = message.cleanContent.match(urlRegex) || [];
	
	// if the message has any URLs or attachments check them for NSFW content
	if (urls.length > 0 || message.attachments.size > 0) {
		// get the URLs from attachments
		for (const attachment of message.attachments.values()) {
			if (attachment.width && attachment.height) { // images have these set
				urls.push(attachment.url);
			}
		}

		checkNSFW(message, urls);
	}

	// Joke Regexes, ignore outside of any aditional jokes.
	if (message.channelId === 'Insert Your Bot Spam Channel ID Here' || message.channelId === '415616380570697729')
	if (reduxRegex.test(message.content)){
		await message.reply(`Yo <@${message.author.id}> it's been 3 years...\n\nStill not upload? Come on man I enjoy your vids so much the intro always brightened my day, make 1 last vid and if it doesn't get 100 likes you can quit.`);
	} else if (rawrRegex.test(message.content)) {
		await message.reply(`what about we convert ${message.guild} into full time furry memes and rp? game servers are overrated`);
	} else if (fourRegex.test(message.content)) {
		await message.reply('in the year 2014 the world ceased to exist for exactly 365 days until that time passed all of the memories you felt in the year 2014 never happened its all an injection of thoughts into your brain which is pretty intresting if you think about it, the fact that we have after that whole 2014 thing went into our brains the world never really ran at full speed again instead we just ran at 0.84638267x speed which is hard for us to notice in day to day use but overtime its really easy to measure with a tape measure to see that it is longer than the average amount of time to do anything Its honestly crazy how no one else noticed except for me after i drank 12 12 packs of monster at 4:14 AM EST on Thanksgiving which is not too far away from November 30th');
	} else if (linuxRegex.test(message.content)) {
		await message.reply(`I'd just like to interject for a moment, <@${message.author.id}>. What you're referring to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux. Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX. Many computer users run a modified version of the GNU system every day, without realizing it. Through a peculiar turn of events, the version of GNU which is widely used today is often called "Linux", and many of its users are not aware that it is basically the GNU system, developed by the GNU Project. There really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system. Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux. All the so-called "Linux" distributions are really distributions of GNU/Linux.`);
	} else if (chubbyRegex.test(message.content)) {
		await message.reply(`I'm Chubby the Snowman, and I've been stuck here ever since Nintendo forgot me from the days of yore. Please, <@${message.author.id}>, help me get back to Nintendo so I can finally get my deserved sequel, which is actually rushed and has several game breaking bugs, even crashing on release!`);
	}
}

module.exports = messageHandler;