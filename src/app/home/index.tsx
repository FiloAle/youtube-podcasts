import EpisodeCard from "@/components/EpisodeCard";
import { useSubscriptions } from "@/contexts/SubscriptionContext";
import { VideoInfo, parseRelativeDate, youtubeService } from "@/lib/youtube";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
	ActivityIndicator,
	Animated,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from "react-native";

export default function HomeScreen() {
	const { subscriptions } = useSubscriptions();
	const [feed, setFeed] = useState<VideoInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const scrollY = React.useRef(new Animated.Value(0)).current;

	const titleOpacity = scrollY.interpolate({
		inputRange: [0, 40],
		outputRange: [1, 0],
		extrapolate: "clamp",
	});

	const loadFeed = async () => {
		if (subscriptions.length === 0) {
			setFeed([]);
			setIsLoading(false);
			return;
		}

		try {
			const results = await Promise.allSettled(
				subscriptions.map((sub) => youtubeService.getChannelVideos(sub.id)),
			);

			let allVideos: VideoInfo[] = [];
			results.forEach((result) => {
				if (result.status === "fulfilled") {
					allVideos = allVideos.concat(result.value.slice(0, 10));
				}
			});

			allVideos.sort((a, b) => {
				const dateA = parseRelativeDate(a.publishedDate);
				const dateB = parseRelativeDate(b.publishedDate);
				if (dateA === dateB) return 0;
				if (dateA === Infinity) return 1;
				if (dateB === Infinity) return -1;
				return dateA - dateB;
			});

			setFeed(allVideos);
		} catch (e) {
			console.error(e);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		setIsLoading(true);
		loadFeed();
	}, [subscriptions]);

	const onRefresh = useCallback(() => {
		setIsRefreshing(true);
		loadFeed();
	}, [subscriptions]);

	const renderVideo = ({ item }: { item: VideoInfo }) => (
		<EpisodeCard
			video={item}
			subtitle={item.channelName}
			onSubtitlePress={() => router.push(`/home/channel/${item.channelId}`)}
		/>
	);

	return (
		<View style={styles.container}>
			<LinearGradient
				colors={["rgba(0,0,0,0.9)", "transparent"]}
				style={styles.headerGradient}
				pointerEvents="none"
			/>

			<Animated.View
				style={[styles.header, { opacity: titleOpacity }]}
				pointerEvents="none"
			>
				<Text style={styles.headerTitle}>Home</Text>
			</Animated.View>

			{subscriptions.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="home-outline" size={64} color="#666" />
					<Text style={styles.emptyText}>La tua home è vuota.</Text>
					<Text style={styles.emptySubtext}>
						Segui qualche canale per vederne gli ultimi episodi qui.
					</Text>
				</View>
			) : isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#fff" />
				</View>
			) : (
				<Animated.FlatList
					data={feed}
					keyExtractor={(item) => item.videoId}
					renderItem={renderVideo}
					contentContainerStyle={[styles.listContent, { paddingTop: 140 }]}
					indicatorStyle="white"
					onScroll={Animated.event(
						[{ nativeEvent: { contentOffset: { y: scrollY } } }],
						{ useNativeDriver: true },
					)}
					scrollEventThrottle={16}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing}
							onRefresh={onRefresh}
							tintColor="#fff"
							progressViewOffset={120}
						/>
					}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	headerGradient: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 140,
		zIndex: 10,
	},
	header: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		zIndex: 11,
		paddingHorizontal: 20,
		paddingTop: 60,
		paddingBottom: 20,
	},
	headerTitle: {
		color: "white",
		fontSize: 34,
		fontWeight: "bold",
		letterSpacing: 0.4,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 32,
	},
	emptyText: {
		color: "white",
		fontSize: 18,
		fontWeight: "600",
		marginTop: 16,
		textAlign: "center",
	},
	emptySubtext: {
		color: "#888",
		fontSize: 15,
		marginTop: 8,
		textAlign: "center",
		lineHeight: 22,
	},
	listContent: {
		paddingHorizontal: 20,
		paddingBottom: 100, // padding for miniplayer
	},
});
