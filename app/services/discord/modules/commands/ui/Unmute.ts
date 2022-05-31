import { ApplicationCommandType, CommandContext, SlashCommand, SlashCreator } from "slash-create";
import { Data } from "@/app/services/Data";
import { DiscordBot } from "../../..";
import { EphemeralResponse } from "..";
import { GuildMember } from "discord.js";

export class UIUnmuteCommand extends SlashCommand {
	private bot: DiscordBot;
	private data: Data;

	constructor(bot: DiscordBot, creator: SlashCreator) {
		super(creator, {
			name: "Unmute User",
			type: ApplicationCommandType.USER,
			guildIDs: [bot.config.guildId],
			requiredPermissions: ["MANAGE_ROLES"],
		});

		this.filePath = __filename;
		this.bot = bot;
		this.data = this.bot.container.getService("Data");
	}

	async run(ctx: CommandContext): Promise<any> {
		await ctx.defer(true);
		const userId = ctx.targetID;

		const { config } = this.bot;
		let { muted } = this.data;

		if (!muted) muted = this.data.muted = {};
		delete muted[userId];
		await this.data.save();

		const guild = this.bot.discord.guilds.cache.get(ctx.guildID);
		if (guild) {
			let member: GuildMember;
			try {
				member = await guild.members.fetch(userId);
			} catch {
				return EphemeralResponse(
					"Couldn't get that User, probably left the guild already..."
				);
			}
			await member.roles.remove(config.mutedRoleId);
			return EphemeralResponse(`${member} has been unmuted.`);
		} else {
			return EphemeralResponse("how#3");
		}
	}
}
