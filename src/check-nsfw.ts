import got from 'got';
import sharp from 'sharp';
import phash from 'sharp-phash';
import * as tf from '@tensorflow/tfjs-node';
import * as nsfw from 'nsfwjs';
import decodeGif from 'decode-gif';
import sequelize from 'sequelize';
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	TextChannel,
	ButtonBuilder
} from 'discord.js';
import { NsfwWarning } from '@/models/nsfwWarnings';
import { notifyUser } from '@/notifications';
import { getChannelFromSettings } from '@/util';
import { NsfwExemption } from '@/models/nsfwExemptions';
import type { ButtonInteraction } from 'discord.js';
import type { Tensor3D } from '@tensorflow/tfjs-node';
import type { Message } from 'discord.js';
import type { NSFWJS, predictionType } from 'nsfwjs';

let model: NSFWJS;
const GIF_MAGIC = Buffer.from([0x47, 0x49, 0x46, 0x38]);
const NSFW_CLASSIFICATIONS = ['Porn', 'Hentai', 'Sexy'];

export const ADD_NSFW_EXEMPTION = 'add-nsfw-exemption';
export const REMOVE_NSFW_EXEMPTION = 'remove-nsfw-exemption';

export async function loadModel(): Promise<void> {
	if (!model) {
		tf.enableProdMode();
		model = await nsfw.load('InceptionV3');
	}
}

export async function checkNSFW(message: Message, urls: string[]): Promise<void> {
	const nsfwDetectionEnabled = getDB().get('nsfw.enabled') === 'true';

	if (!nsfwDetectionEnabled || (message.channel instanceof TextChannel && message.channel.nsfw)) {
		return; // * Do not check if the channel is NSFW
	}

	let exemptionDistance = parseInt(getDB().get('nsfw.exemption.distance') ?? '0');
	if (isNaN(exemptionDistance)) {
		exemptionDistance = 0;
	}

	const messageClassifications = new MessageClassifications();

	for (const url of urls) {
		const { headers } = await got.head(url);
		const contentType = headers['content-type'];

		if (contentType?.search(/^image\//) === -1) {
			continue;
		}

		const data = await got(url).buffer();

		const hash = await phash(data);
		const exemption = await NsfwExemption.findOne({
			where: sequelize.where(sequelize.fn('phhammdist', sequelize.col('hash'), hash), { [sequelize.Op.lte]: exemptionDistance })
		});

		if (exemption) {
			return;
		}
		
		if (data.subarray(0, 4).equals(GIF_MAGIC)) {
			const decodedGif = decodeGif(data);
			const { width, height, frames } = decodedGif;
			for (const frame of frames) {
				const rawImage = await sharp(frame.data, {
					raw: {
						width,
						height,
						channels: 4 
					} 
				}).removeAlpha()
					.median() // * Applying a median filter to remove high frequency artifacts from gif's color-map encoding. This seems to massively improve the classification
					.toBuffer();
				const image = tf.tensor3d(rawImage, [height, width, 3]);
				const classification = await messageClassifications.classify(image, url, data);
				image.dispose(); // * Do not let this image float around memory

				if (classification.top.severity === ClassificationSeverity.High) {
					break;
				}
			}
		} else {
			const rawImage = sharp(data);
			const metadata = await rawImage.metadata();
			const imageData = await rawImage.raw().removeAlpha().toBuffer();
			const image = tf.tensor3d(imageData, [metadata.height ?? 0, metadata.width ?? 0, 3]);
			await messageClassifications.classify(image, url, data);
			image.dispose(); // * Do not let this image float around memory
		}

		const nsfwImages = messageClassifications.getNsfwImages();
		if (nsfwImages.length === 0) {
			return;
		}

		const topClassifiedImage = messageClassifications.getTopClassifiedImage();
		await NsfwWarning.create({ user_id: message.author.id, probability: topClassifiedImage.top.probability });
		await logNsfwAction(message, messageClassifications, hash);

		if (topClassifiedImage.top.severity === ClassificationSeverity.High) {
			await message.delete();

			const replyContent = `I've deleted your message in ${message.channel.url} as I detected that it contained NSFW content. Do not try and post the image again as it will be flagged again!\n\nIf you feel that this has happened in error, please speak to a moderator.`;

			const embed = new EmbedBuilder()
				.addFields([
					{
						name: 'Suspected urls',
						value: messageClassifications
							.getNsfwImages()
							.map(image => image.url)
							.join('\n')
					}
				]);

			const reply = {
				content: replyContent,
				embeds: [embed]
			};

			await notifyUser(message.guild!, message.author, reply);
		}
	}
}

async function logNsfwAction(message: Message, messageClassifications: MessageClassifications, hash: string): Promise<void> {
	const nsfwLogChannel = await getChannelFromSettings(message.guild!, 'channels.nsfw-logs');
	if (!nsfwLogChannel || nsfwLogChannel.type !== ChannelType.GuildText) {
		console.log('NSFW Event Log channel is not configured');
		return;
	}

	const embeds = await createLogEmbeds(message, messageClassifications, hash);
	
	const addExemptionButton = new ButtonBuilder()
		.setCustomId(ADD_NSFW_EXEMPTION)
		.setStyle(ButtonStyle.Secondary)
		.setLabel('Add to exemptions');

	const removeExemptionButton = new ButtonBuilder()
		.setCustomId(REMOVE_NSFW_EXEMPTION)
		.setStyle(ButtonStyle.Secondary)
		.setLabel('Remove from exemptions');

	const actionRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(addExemptionButton, removeExemptionButton);

	const files = messageClassifications.getNsfwImages().map(classification => {
		return new AttachmentBuilder(classification.data)
			.setName('SPOILER_IMAGE.jpg')
			.setDescription(`Image top classification is ${classification.top.className} (${(classification.top.probability * 100).toFixed(2)}%)`);
	});

	nsfwLogChannel.send({ embeds, files, components: [actionRow] }).catch(err => {
		nsfwLogChannel.send({ content: '`Unable to attach image`', embeds });
		console.log(err);
	});
}

async function createLogEmbeds(message: Message, messageClassifications: MessageClassifications, hash: string): Promise<EmbedBuilder[]> {
	const topClassifiedImage = messageClassifications.getTopClassifiedImage();

	const numberOfNsfwFlags = await NsfwWarning.count({
		where: {
			user_id: message.author.id,
			created: {
				[sequelize.Op.gt]: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
			}
		}
	});
	
	let color = 0xFFA500;

	const embed = new EmbedBuilder()
		.addFields([
			{
				name: 'Message author',
				value: `<@${message.author.id}>`
			}
		]);

	if (message.content.length > 0) {
		embed.addFields([
			{
				name: 'Message contents',
				value: message.content
			}
		]);
	}

	if (topClassifiedImage.top.severity === ClassificationSeverity.High) {
		color = 0xF24E43;
	} else {
		embed.addFields([
			{
				name: 'Message link',
				value: message.url
			}
		]);
	}

	embed
		.setColor(color)
		.addFields([
			{
				name: 'Suspected URLs',
				value: messageClassifications
					.getNsfwImages()
					.map(classification => classification.url)
					.join('\n')
			},
			{
				name: 'Sent on',
				value: `<t:${Math.trunc(new Date().getTime() / 1000)}>`
			},
			{
				name: 'Number of NSFW flags for this user (last 30 days)',
				value: numberOfNsfwFlags.toString()
			},
			{
				name: 'Thresholds (High / Low)',
				value: `${messageClassifications.settings.highThreshold * 100}% / ${messageClassifications.settings.lowThreshold * 100}%`,
			},
			...topClassifiedImage.classifications.map(classification => {
				return {
					name: classification.className,
					value: colorMessage(`${(classification.probability * 100).toFixed(2)}%`, classification.severity),
					inline: true
				};
			}),
			{
				name: 'Hash',
				value: `\`${binToHex(hash)}\``
			}
		]);

	return [embed];
}

export async function handleAddNsfwExemption(interaction: ButtonInteraction): Promise<void> {
	await interaction.deferReply();
	let hash = interaction.message.embeds[0].fields
		.find(field => field.name === 'Hash')!
		.value;
	hash = hexToBin(hash.substring(1, hash.length -1));
	await NsfwExemption.create({ user_id: interaction.user.id, hash });
	await interaction.editReply({ content: `Image added to NSFW exemptions by <@${interaction.user.id}>` });
}

export async function handleRemoveNsfwExemption(interaction: ButtonInteraction): Promise<void> {
	await interaction.deferReply();
	let hash = interaction.message.embeds[0].fields
		.find(field => field.name === 'Hash')!
		.value;
	hash = hexToBin(hash.substring(1, hash.length -1));

	const exemption = await NsfwExemption.findOne({ where: { hash } });
	if (exemption) {
		await exemption.destroy();
		await interaction.editReply({ content: `Image removed from NSFW exemptions by <@${interaction.user.id}>` });
	} else {
		await interaction.editReply({ content: 'Image did not exist in NSFW exemptions' });
	}
}

function colorMessage(message: string, type: ClassificationSeverity | null): string {
	let color: string = '';
	switch (type) {
		case ClassificationSeverity.High:
			color = '31';
			break;
		case ClassificationSeverity.Low:
			color = '33';
			break;
	}

	let prefix = '';
	if (color !== '') {
		prefix = `\u001b[0;${color}m`;
	}

	return `\`\`\`ansi\n${prefix}${message}\`\`\``;
}

function binToHex(string: string): string {
	const chunks = string
		.padStart(64, '0')
		.match(/.{8}/g)
		?.map(chunk => parseInt(chunk, 2)) ?? [];
	return Buffer.from(chunks).toString('hex');
}

function hexToBin(string: string): string {
	return [...Buffer.from(string, 'hex')].map((b) => b.toString(2).padStart(8, '0')).join('');
}

class ClassifiedImage {
	readonly settings: ClassificationSettings;
	readonly url: string;
	readonly data: Buffer;
	readonly classifications: ClassificationData[];
	readonly top: ClassificationData;

	constructor(settings: ClassificationSettings, url: string, data: Buffer, classifications: predictionType[]) {
		this.settings = settings;
		this.url = url;
		this.data = data;
		this.classifications = classifications.map(classification => {
			let severity = ClassificationSeverity.None;
			if (NSFW_CLASSIFICATIONS.includes(classification.className)) {
				if (classification.probability >= this.settings.highThreshold) {
					severity = ClassificationSeverity.High;
				} else if (classification.probability >= this.settings.lowThreshold) {
					severity = ClassificationSeverity.Low;
				}
			}
			return {
				className: classification.className,
				probability: classification.probability,
				severity
			};
		});

		this.top = this.classifications.sort((a, b) => b.probability - a.probability)[0];
	}

	compare(other: ClassifiedImage): number {
		if (this.top.severity === other.top.severity) {
			return this.top.probability - other.top.probability;
		}
		return this.top.severity - other.top.severity;
	}
}

class MessageClassifications {
	private images: ClassifiedImage[] = [];
	readonly settings: ClassificationSettings;

	constructor() {
		// * We fetch the settings each time so that if they're changed they'll be updated
		let highThreshold = parseFloat(getDB().get('nsfw.threshold.high') ?? '1');
		if (isNaN(highThreshold)) {
			highThreshold = 1;
		}

		let lowThreshold = parseFloat(getDB().get('nsfw.threshold.low') ?? '0.7');
		if (isNaN(lowThreshold)) {
			lowThreshold = 0.7;
		}

		this.settings = {
			highThreshold, lowThreshold
		};
	}

	async classify(tensor: Tensor3D, url: string, data: Buffer): Promise<ClassifiedImage> {
		const classifications = await model.classify(tensor);
		const classifiedImage = new ClassifiedImage(this.settings, url, data, classifications);

		const existingIndex = this.images.findIndex(image => image.url === url);
		if (existingIndex >= 0) {
			const existingImage = this.images[existingIndex];
			if (classifiedImage.compare(existingImage) > 0) {
				this.images[existingIndex] = classifiedImage;
			}
		} else {
			this.images.push(classifiedImage);
		}

		return classifiedImage;
	}

	getNsfwImages(): ClassifiedImage[] {
		return this.images.filter(image => image.top.severity > ClassificationSeverity.None);
	}

	getTopClassifiedImage(): ClassifiedImage {
		return this.images.sort((a, b) => a.compare(b))[0];
	}
}

interface ClassificationSettings {
	highThreshold: number;
	lowThreshold: number;
}

enum ClassificationSeverity {
	None,
	Low,
	High
}

interface ClassificationData extends predictionType {
	severity: ClassificationSeverity;
}
