import got from 'got';
import * as tensorflow from '@tensorflow/tfjs-node';
import { load } from 'nsfwjs';
import decodeGif from 'decode-gif';
import jpeg from 'jpeg-js';
import { ChannelType, EmbedBuilder, TextChannel } from 'discord.js';
import { getDB } from '@/db';
import path from 'path';
import type { Tensor3D } from '@tensorflow/tfjs-node';
import type { AttachmentPayload, Message } from 'discord.js';
import type { NSFWJS, predictionType } from 'nsfwjs';
import config from '@/config.json';

let model: NSFWJS;
const GIF_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38]);

export async function checkNSFW(message: Message, urls: string[]): Promise<void> {
	if (message.channel instanceof TextChannel && message.channel.nsfw) {
		return; // Do not check if the channel is NSFW
	}

	if (!model) {
		const quantized = config.quantized_nsfw_model ? 'quantized' : 'normal';
		const modelPath = path.join(path.resolve(config.nsfw_model_path), quantized);
		const modelUri = `file://${modelPath}/`;
		
		// * We have to set the options to `any` here because although `type` is a valid option
		// * it's not included in the types, this is also an inline type so we can't enhance it
		model = await load(modelUri, { type: 'graph' } as any);
	}

	const suspectedUrls: string[] = [];
	const suspectedFiles: AttachmentPayload[] = [];
	let predictions: predictionType[] = [];

	for (const url of urls) {
		// Check the headers before requesting data
		const { headers } = await got.head(url);
		const contentType = headers['content-type'];

		// Filter out non-image URLs
		if (contentType?.search(/^image\//) === -1) {
			continue;
		}

		// request the image data
		const data = await got(url).buffer();
		
		// handle GIF frames
		if (data.subarray(0, 4).equals(GIF_MAGIC)) {
			// model.classifyGif is too slow and doesn't let us break out of the classifcation loop
			// reimplement the GIF exploding and frame classification
			const decodedGif = decodeGif(data);
			const { width, height, frames } = decodedGif;
			for (const frame of frames) {
				const frameData = Buffer.from(frame.data);
				const rawImageData = {
					data: frameData,
					width: width,
					height: height,
				};

				// decodeGif returns frames as RGB data
				// need to convert each frame to an image that TensorFlow can understand
				const jpegImageData = jpeg.encode(rawImageData);
				const image = tensorflow.node.decodeImage(jpegImageData.data, 3) as Tensor3D;
				const framePredictions = await model.classify(image);
				image.dispose(); // do not let this image float around memory
				const frameClassification = framePredictions.sort((a, b) => b.probability - a.probability)[0];

				// if low confidence then do nothing
				if (frameClassification.probability < 0.8) {
					continue;
				}

				// aggressive NSFW check
				// flag the GIF if ANY NSFW frame is found
				if (frameClassification.className === 'Porn' || frameClassification.className === 'Hentai' || frameClassification.className === 'Sexy') {
					predictions = framePredictions;
					suspectedUrls.push(url); // if suspected as NSFW then track the url
					suspectedFiles.push({ // if suspected as NSFW then track the GIF
						attachment: data,
						name: 'SPOILER_FILE.jpg'
					});
					break; // end the loop if ANY NSFW frame is found
				}
			}
		} else {
			// handle normal images
			const image = tensorflow.node.decodeImage(data, 3) as Tensor3D;
			predictions = await model.classify(image);
			image.dispose(); // do not let this image float around memory

			// find the highest prediction
			const classification = predictions.sort((a, b) => b.probability - a.probability)[0];

			// if low confidence then do nothing
			if (classification.probability < 0.8) {
				continue;
			}

			// check if the prediction is black listed
			if (classification.className === 'Porn' || classification.className === 'Hentai' || classification.className === 'Sexy') {
				suspectedUrls.push(url); // if suspected as NSFW then track the url
				suspectedFiles.push({ // if suspected as NSFW then track the image
					attachment: data,
					name: 'SPOILER_FILE.jpg'
				});
			}
		}
	}

	// if ANY suspected URLs, punish
	if (suspectedUrls.length > 0) {
		punishUserNSFW(message, suspectedUrls, suspectedFiles, predictions);
	}
}

async function punishUserNSFW(message: Message, suspectedUrls: string[], suspectedFiles: AttachmentPayload[], predictions: predictionType[]): Promise<void> {
	await message.delete(); // remove message

	const mutedRoleId = getDB().get('roles.muted');
	const nsfwPunishedRoleId = getDB().get('roles.nsfw-punished');
	const mutedRole = mutedRoleId && await message.guild!.roles.fetch(mutedRoleId);
	const nsfwPunishedRole = nsfwPunishedRoleId && await message.guild!.roles.fetch(nsfwPunishedRoleId);

	if (!mutedRole) {
		console.log('Missing muted role!');
	} else {
		message.member!.roles.add(mutedRole);
	}

	if (!nsfwPunishedRole) {
		console.log('Missing NSFW punished role!');
	} else {
		message.member!.roles.add(nsfwPunishedRole);
	}

	// log the punisment to the log channel
	const nsfwLogChannelId = getDB().get('channels.nsfw-logs')!;
	const nsfwLogChannel = await message.guild!.channels.fetch(nsfwLogChannelId);
	
	if (!nsfwLogChannel || nsfwLogChannel.type !== ChannelType.GuildText) {
		console.log('Missing NSFW log channel!');
	} else {
		const embed = new EmbedBuilder();
		embed.setTitle(`Suspected NSFW Material sent by ${message.author.tag}`);
		embed.setColor(0xffa500);
		embed.addFields([
			{
				name: 'Suspected URLs',
				value: suspectedUrls.join('\n')
			},
			{
				name: 'Message author',
				value: `<@${message.author.id}>`
			},
			{
				name: 'Sent on',
				value: new Date().toISOString()
			},
			{
				name: predictions[0].className,
				value: predictions[0].probability.toString(),
				inline: true
			},
			{
				name: predictions[1].className,
				value: predictions[1].probability.toString(),
				inline: true
			},
			{
				name: predictions[2].className,
				value: predictions[2].probability.toString(),
				inline: true
			},
			{
				name: predictions[3].className,
				value: predictions[3].probability.toString(),
				inline: true
			},
			{
				name: predictions[4].className,
				value: predictions[4].probability.toString(),
				inline: true
			}
		]);

		nsfwLogChannel.send({ embeds: [embed], files: suspectedFiles }).catch(err => {
			nsfwLogChannel.send({ content: '`Unable to attach image`', embeds: [embed] });
			console.log(err);
		});
	}
}
