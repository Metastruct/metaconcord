import { DiscordBot } from "..";

export default (bot: DiscordBot): void => {
	bot.discord.on("messageCreate", async msg => {
		if (msg.partial) {
			try {
				msg = await msg.fetch();
			} catch {
				return;
			}
		}
		const id = bot.discord.user?.id;
		if (!id) return;
		if (!(msg.mentions.users.first()?.id === id)) return;
		if (
			!bot.config.allowedShitpostingChannels.includes(msg.channelId) ||
			msg.author.bot ||
			msg.content.length <
				(msg.mentions.repliedUser ? (bot.discord.user?.username.length ?? 14) + 2 : 2)
		)
			return;
		const rng = Math.random();

		let reply = "";

		if (rng > 0.2) {
			const mk = await bot.container.getService("Markov")?.generate();
			if (mk) reply = mk;
		} else {
			const images = bot.container.getService("Motd")?.images;
			if (images) {
				const image = images[Math.floor(Math.random() * images.length)];
				reply = image.link;
			}
		}

		if (reply !== "") {
			await msg.reply(reply);
		}
	});
};
