const got = require('got');
const tensorflow = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');
const Discord = require('discord.js');

let model;
const GIF_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38]);

async function checkNSFW(message, urls) {
	if (message.channel.nsfw) {
		return; // Do not check if the channel is NSFW
	}
	if (!model) {
		//const modelPath = 'file://' + __dirname + '/mobilenet_v2_140_224/web_model_quantized/'; // BROKEN???
		//model = await nsfw.load(modelPath);
		model = await nsfw.load();
	}

	const suspectedUrls = [];

	for (const url of urls) {
		// Check the headers before requesting data
		const { headers } = await got.head(url);
		const contentType = headers['content-type'];

		// Filter out non-image URLs
		if (contentType.search(/^image\//) === -1) {
			continue;
		}

		// request the image data
		const data = await got(url).buffer();
		let predictions;
		
		// handle GIF frames
		if (data.subarray(0, 4).equals(GIF_MAGIC)) {
			predictions = [];

			// total GIF predictions
			const totalPredictions = {
				Neutral: 0,
				Drawing: 0,
				Sexy: 0,
				Hentai: 0,
				Porn: 0
			};

			// start classifying the frames
			const framePredictions = await model.classifyGif(data, { topk: 1 });

			// loop over all the frames and add the frame probabilities to the total GIF predictions probabilities
			for (let framePrediction of framePredictions) {
				framePrediction = framePrediction[0];
				totalPredictions[framePrediction.className] += framePrediction.probability;
			}

			// convert into the format the "classify" method returns
			predictions = [
				{ className: 'Neutral', probability: totalPredictions.Neutral },
				{ className: 'Drawing', probability: totalPredictions.Drawing },
				{ className: 'Sexy', probability: totalPredictions.Sexy },
				{ className: 'Hentai', probability: totalPredictions.Hentai },
				{ className: 'Porn', probability: totalPredictions.Porn }
			];
		} else {
			// handle normal images
			const image = await tensorflow.node.decodeImage(data, 3);
			predictions = await model.classify(image);
			image.dispose(); // do not let this image float around memory
		}
		
		// find the highest prediction
		const classification = predictions.reduce((previous, current) => {
			return (previous.probability > current.probability) ? previous : current;
		});

		// check if the prediction is black listed
		if (classification.className === 'Porn' || classification.className === 'Hentai' || classification.className === 'Sexy') {
			suspectedUrls.push(url); // if suspected as NSFW then track it
		}
	}

	// if ANY suspected URLs, punish
	if (suspectedUrls.length > 0) {
		punishUserNSFW(message, suspectedUrls);
	}
}

async function punishUserNSFW(message, suspectedUrls) {
	await message.delete(); // remove message

	// get the punishment roles
	const mutedRole = message.guild.roles.cache.find((role) => role.name === 'Muted');
	const NSFWPunishedRole = message.guild.roles.cache.find((role) => role.name === 'NSFW Punished');
	
	// add the punishment roles to user
	message.member.roles.add(mutedRole);
	message.member.roles.add(NSFWPunishedRole);

	// log the punisment to the log channel
	const NSFWPunishedLogsChannel = message.guild.channels.cache.find((channel) => channel.name === 'nsfw-punished-logs');

	const embed = new Discord.MessageEmbed();
	embed.setTitle(`Suspected NSFW Material sent by ${message.author.tag}`);
	embed.setColor(0xffa500);
	embed.setDescription(suspectedUrls.join('\n'));

	NSFWPunishedLogsChannel.send(embed);
}

module.exports = checkNSFW;