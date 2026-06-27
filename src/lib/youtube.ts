import "./polyfill";

import Innertube from "youtubei.js";

export interface ChannelInfo {
	id: string;
	name: string;
	thumbnail: string;
	subscribers: string;
	description: string;
}

export interface VideoInfo {
	videoId: string;
	title: string;
	duration: string;
	durationSeconds: number;
	viewCount: string;
	publishedDate: string;
	thumbnailUrl: string;
	channelName: string;
	channelId?: string;
}

export interface AudioStreamInfo {
	url: string;
	fallbackUrl?: string;
	codec: string;
	mimeType: string;
	bitrate: number;
	sampleRate: number;
	channels: number;
	contentLengthBytes: number;
}

export function parseRelativeDate(text: string): number {
	if (!text) return Infinity;
	const numMatch = text.match(/\d+/);
	if (!numMatch) return Infinity;
	const num = parseInt(numMatch[0], 10);

	const lower = text.toLowerCase();
	if (lower.includes("second") || lower.includes("sec")) return num;
	if (
		lower.includes("minute") ||
		lower.includes("minuto") ||
		lower.includes("minuti") ||
		lower.includes("min")
	)
		return num * 60;
	if (
		lower.includes("hour") ||
		lower.includes("ora") ||
		lower.includes("ore") ||
		lower.includes("hr")
	)
		return num * 3600;
	if (
		lower.includes("day") ||
		lower.includes("giorno") ||
		lower.includes("giorni")
	)
		return num * 86400;
	if (
		lower.includes("week") ||
		lower.includes("settimana") ||
		lower.includes("settimane") ||
		lower.includes("wk")
	)
		return num * 86400 * 7;
	if (
		lower.includes("month") ||
		lower.includes("mese") ||
		lower.includes("mesi") ||
		lower.includes("mo")
	)
		return num * 86400 * 30;
	if (
		lower.includes("year") ||
		lower.includes("anno") ||
		lower.includes("anni") ||
		lower.includes("yr")
	)
		return num * 86400 * 365;
	return Infinity;
}

class YouTubeService {
	private yt: Innertube | null = null;
	private initializing: Promise<void> | null = null;

	async init() {
		if (this.yt) return;
		if (this.initializing) return this.initializing;

		this.initializing = (async () => {
			// Pass lang and location to prevent automatic translation to local language
			this.yt = await Innertube.create({ lang: "it", location: "IT" });
		})();

		await this.initializing;
		this.initializing = null;
	}

	async searchChannels(query: string): Promise<ChannelInfo[]> {
		await this.init();
		if (!this.yt) throw new Error("YouTube.js not initialized");

		const results = await this.yt.search(query, { type: "channel" });
		const channels = results.results ?? [];

		return channels.map((ch: any) => {
			const thumbnails = ch.author?.thumbnails ?? [];
			let thumbUrl =
				thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : "";
			if (thumbUrl.startsWith("//")) thumbUrl = "https:" + thumbUrl;
			return {
				id: ch.author?.id ?? "",
				name: ch.author?.name ?? "Sconosciuto",
				thumbnail: thumbUrl,
				subscribers: ch.subscriber_count?.text ?? "",
				description: ch.description_snippet?.text ?? "",
			};
		});
	}

	async getChannelInfo(id: string): Promise<ChannelInfo> {
		await this.init();
		if (!this.yt) throw new Error("YouTube.js not initialized");

		const channel = await this.yt.getChannel(id);
		const thumbnails = channel.metadata?.avatar ?? [];
		let thumbUrl =
			thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : "";
		if (thumbUrl.startsWith("//")) thumbUrl = "https:" + thumbUrl;

		let subscribers = (channel.header as any)?.subscribers?.text ?? "";
		const metadataRows =
			(channel.header as any)?.content?.metadata?.metadata_rows ?? [];
		for (const row of metadataRows) {
			for (const part of row.metadata_parts ?? []) {
				const text =
					part.text?.text ?? (typeof part.text === "string" ? part.text : "");
				if (
					text.toLowerCase().includes("subscriber") ||
					text.toLowerCase().includes("iscritti")
				) {
					subscribers = text;
				}
			}
		}

		return {
			id: channel.metadata?.external_id ?? id,
			name: channel.metadata?.title ?? "Sconosciuto",
			thumbnail: thumbUrl,
			subscribers,
			description: channel.metadata?.description ?? "",
		};
	}

	async getChannelVideos(channelId: string): Promise<VideoInfo[]> {
		await this.init();
		if (!this.yt) throw new Error("YouTube.js not initialized");

		const channel = await this.yt.getChannel(channelId);

		let allRawVideos: any[] = [];

		if (channel.has_videos) {
			try {
				const videosTab = await channel.getVideos();
				allRawVideos = allRawVideos.concat(videosTab.videos ?? []);
			} catch (e) {
				console.warn("Could not fetch videos tab", e);
			}
		}

		if (channel.has_live_streams) {
			try {
				const liveTab = await channel.getLiveStreams();
				allRawVideos = allRawVideos.concat(liveTab.videos ?? []);
			} catch (e) {
				console.warn("Could not fetch live streams tab", e);
			}
		}

		const videos = allRawVideos
			.map((video: any) => {
				// Salta esplicitamente le live correnti (in corso) e contenuti riservati agli abbonati
				if (video.is_live) return null;

				let isMembersOnly = false;
				const badges = video.badges ?? video.author?.badges ?? [];
				for (const badge of badges) {
					const text = badge.text?.toLowerCase() || "";
					if (
						text.includes("member") ||
						text.includes("abbonat") ||
						text.includes("sponsor")
					) {
						isMembersOnly = true;
					}
				}
				if (isMembersOnly) return null;

				const title =
					video.metadata?.title?.text ?? video.title?.text ?? "Senza titolo";
				const videoId = video.content_id ?? video.video_id ?? video.id ?? "";

				let duration = "";
				let durationSeconds = 0;
				const overlays = video.content_image?.overlays ?? [];
				for (const overlay of overlays) {
					if (overlay.type === "ThumbnailBottomOverlayView") {
						for (const badge of overlay.badges ?? []) {
							if (badge.text) {
								duration = badge.text;
								// Calcolo grezzo dei secondi
								const parts = duration.split(":").map(Number);
								if (parts.length === 3)
									durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
								else if (parts.length === 2)
									durationSeconds = parts[0] * 60 + parts[1];
								break;
							}
						}
					}
					if (duration) break;
				}

				let viewCount = "";
				let publishedDate = "";
				const metadataRows = video.metadata?.metadata?.metadata_rows ?? [];
				for (const row of metadataRows) {
					for (const part of row.metadata_parts ?? []) {
						const text =
							part.text?.text ??
							(typeof part.text === "string" ? part.text : "");
						if (text.includes("view") || text.includes("visualizzazion")) {
							viewCount = text;
						} else if (
							text.includes("ago") ||
							text.includes("fa") ||
							text.includes("hour") ||
							text.includes("day") ||
							text.includes("week") ||
							text.includes("month") ||
							text.includes("year") ||
							text.includes("Streamed") ||
							text.includes("Trasmesso")
						) {
							publishedDate = text
								.replace(/Trasmesso in streaming /i, "")
								.replace(/Streamed /i, "")
								.trim();
						}
					}
				}

				const thumbImages = video.content_image?.image ?? [];
				const thumbnailUrl =
					Array.isArray(thumbImages) && thumbImages.length > 0
						? thumbImages[0].url
						: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

				const channelName = channel.metadata?.title ?? "";

				return {
					title,
					videoId,
					duration,
					durationSeconds,
					viewCount,
					publishedDate,
					thumbnailUrl,
					channelName,
					channelId,
				};
			})
			.filter((v: any) => v && v.videoId && v.duration) as VideoInfo[];

		// Ordina i video e le live in modo cronologico mescolandoli (dal più recente al più vecchio)
		videos.sort((a, b) => {
			const dateA = parseRelativeDate(a.publishedDate);
			const dateB = parseRelativeDate(b.publishedDate);
			if (dateA === dateB) return 0;
			if (dateA === Infinity) return 1;
			if (dateB === Infinity) return -1;
			return dateA - dateB;
		});

		return videos;
	}

	// Not strictly required right now, but nice to have ready for playback later
	async getAudioStream(videoId: string): Promise<AudioStreamInfo | null> {
		await this.init();
		if (!this.yt) throw new Error("YouTube.js not initialized");

		try {
			const info = await this.yt.getBasicInfo(videoId, {
				client: "ANDROID_VR",
			});

			if (info.playability_status?.status === "UNPLAYABLE") {
				throw new Error(
					info.playability_status.reason ||
						"Video non riproducibile (forse riservato agli abbonati)",
				);
			}
			if (info.playability_status?.status === "LIVE_STREAM_OFFLINE") {
				throw new Error(
					info.playability_status.reason ||
						"Questo evento dal vivo non è ancora iniziato.",
				);
			}

			const progressive = (info.streaming_data?.formats ?? []).filter(
				(f: any) => f.has_audio && f.url,
			);
			const fallbackUrl =
				progressive.length > 0 ? progressive[0].url : undefined;

			const audioFormats = [
				...(info.streaming_data?.adaptive_formats ?? []),
			].filter((f: any) => f.has_audio && !f.has_video && f.url);

			if (audioFormats.length > 0) {
				audioFormats.sort(
					(a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0),
				);
				const bestM4a = audioFormats.find((f: any) =>
					f.mime_type?.includes("mp4a"),
				);
				const fmt = bestM4a ?? audioFormats[0];

				return {
					url: fmt.url ?? "",
					fallbackUrl: fallbackUrl,
					codec: fmt.mime_type?.match(/codecs="([^"]+)"/)?.[1] ?? "unknown",
					mimeType: fmt.mime_type,
					bitrate: fmt.bitrate ?? 0,
					sampleRate: fmt.audio_sample_rate ?? 0,
					channels: fmt.audio_channels ?? 2,
					contentLengthBytes: fmt.content_length ?? 0,
				};
			}

			if (progressive.length > 0) {
				const fmt = progressive[0];
				return {
					url: fmt.url ?? "",
					codec: "progressive",
					mimeType: fmt.mime_type,
					bitrate: fmt.bitrate ?? 0,
					sampleRate: fmt.audio_sample_rate ?? 0,
					channels: fmt.audio_channels ?? 2,
					contentLengthBytes: fmt.content_length ?? 0,
				};
			}

			// Fallback: HLS manifest
			if (info.streaming_data?.hls_manifest_url) {
				return {
					url: info.streaming_data.hls_manifest_url,
					codec: "hls",
					mimeType: "application/x-mpegURL",
					bitrate: 0,
					sampleRate: 44100,
					channels: 2,
					contentLengthBytes: 0,
				};
			}

			throw new Error("Nessun flusso audio compatibile trovato");
		} catch (e: any) {
			throw e;
		}
	}
}

export const youtubeService = new YouTubeService();
