import { Container } from "@/app/Container";
import { Service } from ".";
import SteamAPI, { PlayerSummary } from "steamapi";
import SteamID from "steamid";
import axios from "axios";
import config from "@/config/steam.json";
import qs from "qs";

type UserCache = {
	expireTime: number;
	summary?: PlayerSummary;
};
const validTime = 30 * 60 * 1000;
const avatarRegExp = /<avatarFull>\s*<!\[CDATA\[\s*([^\s]*)\s*\]\]>\s*<\/avatarFull>/;

export class Steam extends Service {
	name = "Steam";
	api: SteamAPI = new SteamAPI(config.apiKey);
	private userCache: {
		[steamId64: string]: UserCache;
	} = {};

	async getUserSummaries(steamId64: string): Promise<any> {
		const userCache = this.getUserCache(steamId64);
		if (!userCache.summary) {
			try {
				const summary = await this.api.getUserSummary(steamId64);
				const { status } = await axios.head(summary.avatar.large);
				if (status >= 400) {
					const { data } = await axios.get(
						`https://steamcommunity.com/profiles/${steamId64}?xml=1`
					);
					const results = avatarRegExp.exec(data);
					if (results && results[1].trim().length) {
						summary.avatar.large = results[1];
					}
				}
				userCache.summary = summary;
			} catch (err) {
				// do nothing
			}
		}
		return userCache.summary;
	}

	async getPublishedFileDetails(ids: string[]): Promise<any> {
		const query = {
			publishedfileids: ids,
			itemcount: ids.length,
			key: config.apiKey,
		};
		return (
			await axios
				.post(
					`https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1`,
					qs.stringify(query)
				)
				.catch(() => {
					return { data: { response: {} } };
				})
		).data.response;
	}

	async getUserAvatar(steamId64: string): Promise<string> {
		return (await this.getUserSummaries(steamId64).catch())?.avatar?.large;
	}

	private getUserCache(steamId64: string): UserCache {
		if (!this.userCache[steamId64] || this.userCache[steamId64].expireTime < Date.now()) {
			this.userCache[steamId64] = {
				expireTime: Date.now() + validTime,
			};
		}
		return this.userCache[steamId64];
	}

	public steamIDToSteamID64(steamid: string): string {
		return new SteamID(steamid).getSteamID64();
	}
}

export default function SteamProvider(container: Container): Service {
	return new Steam(container);
}
