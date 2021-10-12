import * as requestSchema from "./structures/AdminNotifyRequest.json";
import { AdminNotifyRequest } from "./structures";
import { GameServer } from "..";
import Discord, { TextChannel } from "discord.js";
import Payload from "./Payload";
import SteamID from "steamid";
import fs from "fs";
import path from "path";

export default class AdminNotifyPayload extends Payload {
	protected static requestSchema = requestSchema;

	static async handle(payload: AdminNotifyRequest, server: GameServer): Promise<void> {
		super.handle(payload, server);

		const { player, reported } = payload.data;
		let { message } = payload.data;
		const { bridge, discord: discordClient } = server;

		if (!discordClient.isReady()) return;

		const guild = discordClient.guilds.cache.get(bridge.config.guildId);
		if (!guild) return;

		const callAdminRole = guild.roles.cache.get(bridge.config.callAdminRoleId);

		const notificationsChannel = guild.channels.cache.get(bridge.config.notificationsChannelId);
		if (!notificationsChannel) return;

		const steamId64 = new SteamID(player.steamId).getSteamID64();
		const reportedSteamId64 = new SteamID(reported.steamId).getSteamID64();
		const steam = bridge.container.getService("Steam");
		const avatar = await steam.getUserAvatar(steamId64);
		const reportedAvatar = await steam.getUserAvatar(reportedSteamId64);
		if (message.trim().length < 1) message = "No message provided..?";

		const embed = new Discord.MessageEmbed()
			.setAuthor(
				`${player.nick} reported a player`,
				avatar,
				`https://steamcommunity.com/profiles/${steamId64}`
			)
			.addField("Nick", reported.nick)
			.addField("Message", message)
			.addField(
				"SteamID",
				`[${reportedSteamId64}](https://steamcommunity.com/profiles/${reportedSteamId64}) (${reported.steamId})`
			)
			.setThumbnail(reportedAvatar)
			.setColor(0xc4af21);
		// You can have a maximum of five ActionRows per message, and five buttons within an ActionRow.
		const row = new Discord.MessageActionRow().addComponents([
			{
				label: "KICK Offender",
				type: 2,
				style: "SECONDARY",
				emoji: "🥾",
				customId: `${reportedSteamId64}_REPORT_KICK`,
			},
			{
				label: "KICK Reporter",
				type: 2,
				style: "SECONDARY",
				emoji: "🥾",
				customId: `${steamId64}_REPORT_KICK`,
			},
		]);

		let discordMsg: Discord.Message;
		try {
			discordMsg = await (notificationsChannel as TextChannel).send({
				content: callAdminRole && `<@&${callAdminRole.id}>`,
				embeds: [embed],
				components: [row],
			});
		} catch {
			embed.fields = embed.fields.filter(f => f.name !== "Message");
			const reportPath = path.resolve(
				`${Date.now()}_${player.nick}_report.txt`.toLocaleLowerCase()
			);
			await new Promise<void>((resolve, reject) =>
				fs.writeFile(reportPath, message, err => (err ? reject(err.message) : resolve()))
			);

			discordMsg = await (notificationsChannel as TextChannel).send({
				content: callAdminRole && `<@&${callAdminRole.id}>`,
				files: [reportPath],
				embeds: [embed],
				components: [row],
			});

			await new Promise<void>((resolve, reject) =>
				fs.unlink(reportPath, err => (err ? reject(err.message) : resolve()))
			);
		}

		const sql = bridge.container.getService("Sql");
		const db = await sql.getDatabase();
		const hasTable = await sql.tableExists("reports");
		if (!hasTable) {
			await db.exec(`CREATE TABLE reports (id VARCHAR(1000), server INT, date DATETIME);`);
		}

		await db.run(
			"INSERT INTO reports (id, server, date) VALUES(?, ?, ?);",
			discordMsg.id,
			server.config.id,
			Date.now() / 1000 // unix timestamp
		);
	}
}
