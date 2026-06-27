import EpisodeCard from "@/components/EpisodeCard";
import { usePlayer } from "@/contexts/PlayerContext";
import { useSubscriptions } from "@/contexts/SubscriptionContext";
import { ChannelInfo, VideoInfo, youtubeService } from "@/lib/youtube";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";

export default function ChannelScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { isSubscribed, toggleSubscription } = useSubscriptions();
	const [channel, setChannel] = useState<ChannelInfo | null>(null);
	const [videos, setVideos] = useState<VideoInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	const isSubbed = channel ? isSubscribed(channel.id) : false;

	useEffect(() => {
		if (!id) return;

		const loadData = async () => {
			setIsLoading(true);
			setError("");
			try {
				const [chInfo, chVideos] = await Promise.all([
					youtubeService.getChannelInfo(id),
					youtubeService.getChannelVideos(id),
				]);
				setChannel(chInfo);
				setVideos(chVideos);
			} catch (err: any) {
				setError(err.message || "Errore nel caricamento del canale");
			} finally {
				setIsLoading(false);
			}
		};

		loadData();
	}, [id]);

	const renderHeader = useCallback(() => {
		if (!channel) return null;
		return (
			<View style={styles.headerContainer}>
				<Image
					source={{ uri: channel.thumbnail }}
					style={styles.coverImage}
					contentFit="cover"
				/>
				<Text style={styles.channelTitle}>{channel.name}</Text>
				<Text style={styles.channelAuthor}>{channel.subscribers}</Text>

				<Pressable
					style={[
						styles.followButton,
						isSubbed && styles.followedButton,
					]}
					onPress={() => toggleSubscription(channel)}
				>
					<Text
						style={[
							styles.followButtonText,
							isSubbed && styles.followedButtonText,
						]}
					>
						{isSubbed ? "Segui già" : "Segui"}
					</Text>
				</Pressable>

				<Text style={styles.channelDescription} numberOfLines={4}>
					{channel.description}
				</Text>

				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Puntate</Text>
				</View>
			</View>
		);
	}, [channel, isSubbed, toggleSubscription]);

	const renderVideo = useCallback(
		({ item }: { item: VideoInfo }) => (
			<EpisodeCard
				video={item}
				subtitle={
					item.viewCount
						? item.viewCount
								.replace(/views/i, "riproduzioni")
								.replace(/visualizzazioni/i, "riproduzioni")
						: undefined
				}
			/>
		),
		[],
	);

	if (isLoading) {
		return (
			<View style={styles.centerContainer}>
				<Stack.Screen options={{ title: "Caricamento..." }} />
				<ActivityIndicator size="large" color="#fff" />
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<Stack.Screen options={{ title: "Errore" }} />
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Stack.Screen options={{ title: channel?.name || "Podcast" }} />
			<FlatList
				data={videos}
				keyExtractor={(item) => item.videoId}
				renderItem={renderVideo}
				ListHeaderComponent={renderHeader}
				contentContainerStyle={styles.listContent}
				indicatorStyle="white"
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	centerContainer: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	listContent: {
		padding: 20,
		// Provide padding for the translucent header
		paddingTop: 120, // Adjust depending on safe area
	},
	headerContainer: {
		alignItems: "center",
		marginBottom: 20,
	},
	coverImage: {
		width: 200,
		height: 200,
		borderRadius: 16,
		marginBottom: 20,
		backgroundColor: "#222",
	},
	channelTitle: {
		color: "white",
		fontSize: 22,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 8,
	},
	channelAuthor: {
		color: "#aaa",
		fontSize: 16,
		textAlign: "center",
		marginBottom: 20,
	},
	followButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#E6E6EB",
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 24,
		marginBottom: 24,
		width: "100%",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "transparent",
	},
	followedButton: {
		backgroundColor: "transparent",
		borderColor: "#666",
	},
	followButtonText: {
		color: "black",
		fontSize: 16,
		fontWeight: "600",
	},
	followedButtonText: {
		color: "#FFF",
	},
	channelDescription: {
		color: "#ccc",
		fontSize: 15,
		lineHeight: 22,
		textAlign: "left",
		width: "100%",
		marginBottom: 30,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		width: "100%",
		marginBottom: 16,
		paddingBottom: 8,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#333",
	},
	sectionTitle: {
		color: "white",
		fontSize: 22,
		fontWeight: "bold",
		marginRight: 4,
	},
	errorText: {
		color: "#ff453a",
		fontSize: 16,
		textAlign: "center",
	},
});
