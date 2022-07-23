import PayloadRequest from "./PayloadRequest";
export default interface BanAppealRequest extends PayloadRequest {
	name: "BanAppealPayload";
	data: {
		player: {
			nick: string;
			steamId: string;
		};
		banned: { nick: string; steamId: string };
		banReason: string;
		appeal: string;
		unbanTime: string;
	};
}
