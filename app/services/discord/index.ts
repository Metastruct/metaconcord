import { Container } from "@/app/Container";
import { GatewayServer, SlashCommand, SlashCreator } from "slash-create";
import { Service } from "@/app/services";
import { SlashCustomRoleCommand } from "./commands/CustomRoleCommand";
import { SlashGservCommand } from "./commands/GservCommand";
import { SlashLuaCommand } from "./commands/LuaCommand";
import { SlashMarkovCommand } from "./commands/MarkovCommand";
import { SlashMuteCommand } from "./commands/mute/MuteCommand";
import { SlashRconCommand } from "./commands/RconCommand";
import { SlashUnmuteCommand } from "./commands/mute/UnmuteCommand";
import { SlashWhyMuteCommand } from "./commands/mute/WhyMuteCommand";
import Discord from "discord.js";
import config from "@/discord.json";

const DELETE_COLOR: Discord.ColorResolvable = [255, 0, 0];
const EDIT_COLOR: Discord.ColorResolvable = [220, 150, 0];
const EMBED_FIELD_LIMIT = 1999;

export class DiscordBot extends Service {
	name = "DiscordBot";
	config = config;
	discord: Discord.Client = new Discord.Client();

	constructor(container: Container) {
		super(container);

		const creator = new SlashCreator({
			applicationID: config.applicationId,
			publicKey: config.publicKey,
			token: config.token,
		});
		// Emergency mode lolol
		// creator.on("error", console.log);
		// creator.on("commandError", console.log);
		// creator.on("warn", console.log);
		// creator.on("debug", console.log);
		// creator.on("ping", console.log);
		// creator.on("rawREST", console.log);
		// creator.on("unknownInteraction", console.log);
		// creator.on("unverifiedRequest", console.log);
		// creator.on("synced", console.log);
		// creator.on("ping", console.log);
		creator.withServer(
			new GatewayServer(handler =>
				this.discord.ws.on("INTERACTION_CREATE" as Discord.WSEventType, handler)
			)
		);
		const cmds: Array<SlashCommand> = [
			new SlashMarkovCommand(this, creator),
			new SlashMuteCommand(this, creator),
			new SlashUnmuteCommand(this, creator),
			new SlashWhyMuteCommand(this, creator),
			new SlashGservCommand(this, creator),
			new SlashCustomRoleCommand(this, creator),
			new SlashLuaCommand(this, creator),
			new SlashRconCommand(this, creator),
		];
		for (const slashCmd of cmds) {
			creator.registerCommand(slashCmd);
		}

		this.discord.on("ready", () => {
			console.log(`'${this.discord.user.username}' Discord Bot has logged in`);
			this.setStatus(`Crashing the source engine`);

			setInterval(() => {
				const newStatus = this.container.getService("Markov").generate();
				this.setStatus(newStatus);
			}, 1000 * 60 * 10); // change status every 10mins

			creator.syncCommands();
		});

		this.discord.on("message", ev => {
			this.handleTwitterEmbeds(ev as Discord.Message);
			this.handleMarkov(ev);
		});

		this.discord.on("messageDelete", async msg => {
			if (msg.author.bot) return;

			const logChannel = await this.getGuildTextChannel(config.logChannelId);
			if (!logChannel) return;

			const message =
				msg.content.length > 1
					? msg.content
					: msg.attachments
					? `[${msg.attachments.first().name}]`
					: "???";

			const embed = new Discord.MessageEmbed()
				.setAuthor(msg.author.username, msg.author.avatarURL())
				.setColor(DELETE_COLOR)
				.addField("Channel", `<#${msg.channel.id}>`)
				.addField("Mention", msg.author.mention)
				.addField("Message", message.substring(0, EMBED_FIELD_LIMIT), true)
				.setFooter("Message Deleted")
				.setTimestamp(Date.now());
			logChannel.send(embed);
		});

		this.discord.on("messageUpdate", async (oldMsg, newMsg) => {
			// discord manages embeds by updating user messages
			if (oldMsg.content === newMsg.content) return;
			if (oldMsg.author.bot) return;

			const logChannel = await this.getGuildTextChannel(config.logChannelId);
			if (!logChannel) return;

			const embed = new Discord.MessageEmbed()
				.setAuthor(oldMsg.author.username, oldMsg.author.avatarURL())
				.setColor(EDIT_COLOR)
				.addField("Channel", `<#${oldMsg.channel.id}>`)
				.addField("Mention", oldMsg.author.mention)
				.addField("New Message", newMsg.content.substring(0, EMBED_FIELD_LIMIT), true)
				.addField("Old Message", oldMsg.content.substring(0, EMBED_FIELD_LIMIT), true)
				.setFooter("Message Edited")
				.setTimestamp(newMsg.editedTimestamp);
			logChannel.send(embed);
		});

		this.discord.login(config.token);
	}

	private async getGuildTextChannel(channelId: string): Promise<Discord.TextChannel> {
		const guild = await this.discord.guilds.resolve(config.guildId)?.fetch();
		if (!guild) return;

		const chan = (await guild.channels.resolve(channelId)?.fetch()) as Discord.TextChannel;
		return chan;
	}

	private setStatus(status: string): void {
		if (status.length > 127) status = status.substring(0, 120) + "...";

		this.discord.user.setPresence({
			activity: {
				name: status.trim().substring(0, 100),
				type: "PLAYING",
			},
			status: "online",
		});
	}

	private async handleMarkov(ev: Discord.Message): Promise<void> {
		if (ev.author.bot || ev.guild?.id !== config.guildId) return;

		const chan = (await ev.channel.fetch()) as Discord.GuildChannel;
		const guild = await chan.guild.fetch();
		const roles = await guild.roles.fetch();
		const perms = chan.permissionsFor(roles.everyone);
		if (!perms.has("SEND_MESSAGES")) return; // dont get text from channels that are not "public"

		const content = ev.content;
		if (this.container.getService("Motd").isValidMsg(content))
			this.container.getService("Markov").addLine(content);
	}

	private async handleTwitterEmbeds(ev: Discord.Message): Promise<void> {
		const statusUrls = ev.content.match(
			/https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)/g
		);
		if (!statusUrls) return;

		let urls: Array<string> = [];
		for (const statusUrl of statusUrls) {
			const mediaUrls = await this.container
				.getService("Twitter")
				.getStatusMediaURLs(statusUrl);
			urls = urls.concat(mediaUrls);
		}

		if (urls.length === 0) return;

		const msg = urls.join("\n").substring(0, EMBED_FIELD_LIMIT);
		ev.channel.send(msg);
	}
}

export default (container: Container): Service => {
	return new DiscordBot(container);
};
