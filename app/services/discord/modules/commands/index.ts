import { DiscordBot } from "../..";
import { GatewayServer, SlashCreator } from "slash-create";
import { MessageOptions } from "slash-create";
import { SlashBanCommand } from "./developer/Ban";
import { SlashCustomRoleCommand } from "./CustomRole";
import { SlashGservCommand } from "./developer/Gserv";
import { SlashKickCommand } from "./developer/Kick";
import { SlashLuaCommand } from "./developer/Lua";
// import { SlashMarkovCommand } from "./Markov";
import { SlashMuteCommand } from "./mute/Mute";
import { SlashRconCommand } from "./developer/Rcon";
import { SlashRefreshLuaCommand } from "./developer/RefreshLua";
import { SlashSqlCommand } from "./developer/Sql";
import { SlashUnBanCommand } from "./developer/UnBan";
import { SlashUnmuteCommand } from "./mute/Unmute";
import { SlashVaccinatedCommand } from "./Vaccination";
import { SlashWhyBanCommand } from "./WhyBan";
import { SlashWhyMuteCommand } from "./mute/WhyMute";
import { UIMuteCommand } from "./ui/Mute";
import { UIUnmuteCommand } from "./ui/Unmute";
import { UIWhyMuteCommand } from "./ui/WhyMute";

export function EphemeralResponse(content: string): MessageOptions {
	return { content, ephemeral: true };
}

export const commands = [
	// SlashMarkovCommand,
	SlashMuteCommand,
	SlashUnmuteCommand,
	SlashWhyMuteCommand,
	SlashGservCommand,
	SlashCustomRoleCommand,
	SlashVaccinatedCommand,
	SlashLuaCommand,
	SlashRconCommand,
	SlashRefreshLuaCommand,
	SlashWhyBanCommand,
	SlashBanCommand,
	SlashUnBanCommand,
	SlashKickCommand,
	SlashSqlCommand,
	UIMuteCommand,
	UIUnmuteCommand,
	UIWhyMuteCommand,
];

export default (bot: DiscordBot): void => {
	const creator = new SlashCreator({
		applicationID: bot.config.applicationId,
		publicKey: bot.config.publicKey,
		token: bot.config.token,
	});
	// Emergency mode lolol
	creator.on("error", console.error);
	creator.on("commandError", console.error);
	creator.on("warn", console.warn);
	// creator.on("debug", console.log);
	// creator.on("ping", console.log);
	// creator.on("rawREST", console.log);
	// creator.on("unknownInteraction", console.log);
	// creator.on("unverifiedRequest", console.log);
	// creator.on("synced", console.log);
	creator.withServer(
		new GatewayServer(handler => bot.discord.ws.on("INTERACTION_CREATE", handler))
	);
	for (const slashCmd of commands) {
		creator.registerCommand(new slashCmd(bot, creator));
	}

	creator.syncCommands();
};
