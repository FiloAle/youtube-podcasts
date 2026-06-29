import { useSubscriptions } from "@/contexts/SubscriptionContext";
import { ChannelInfo } from "@/lib/youtube";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
	Animated,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from "react-native";

export default function FollowedScreen() {
	const { subscriptions, refreshSubscriptions } = useSubscriptions();
	const [isRefreshing, setIsRefreshing] = React.useState(false);

	const scrollY = React.useRef(new Animated.Value(0)).current;

	const titleOpacity = scrollY.interpolate({
		inputRange: [0, 40],
		outputRange: [1, 0],
		extrapolate: "clamp",
	});

	const onRefresh = React.useCallback(async () => {
		setIsRefreshing(true);
		await refreshSubscriptions();
		setIsRefreshing(false);
	}, [refreshSubscriptions]);

	const renderChannel = ({ item }: { item: ChannelInfo }) => (
		<Pressable
			style={styles.channelCard}
			onPress={() => router.push(`/followed/channel/${item.id}`)}
		>
			<Image
				source={{ uri: item.thumbnail }}
				style={styles.channelThumbnail}
				contentFit="cover"
			/>
			<View style={styles.channelInfo}>
				<Text style={styles.channelName} numberOfLines={1}>
					{item.name}
				</Text>
				<Text style={styles.channelSubscribers}>{item.subscribers}</Text>
			</View>
			<Ionicons name="chevron-forward" size={20} color="#666" />
		</Pressable>
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
				<Text style={styles.headerTitle}>Seguiti</Text>
			</Animated.View>

			{subscriptions.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Ionicons name="people-outline" size={64} color="#666" />
					<Text style={styles.emptyText}>Non segui ancora nessun canale</Text>
					<Text style={styles.emptySubtext}>
						Cerca i tuoi podcast preferiti e tocca "Segui" per ritrovarli qui
					</Text>
				</View>
			) : (
				<Animated.FlatList
					data={subscriptions}
					keyExtractor={(item) => item.id}
					renderItem={renderChannel}
					contentContainerStyle={[styles.listContent, { paddingTop: 120 }]}
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
							tintColor="white"
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
		backgroundColor: "#000", // Apple Podcasts style dark background
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
	listContent: {
		paddingHorizontal: 20,
		paddingBottom: 100, // padding for miniplayer
	},
	channelCard: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "#333",
	},
	channelThumbnail: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "#222",
	},
	channelInfo: {
		flex: 1,
		marginLeft: 16,
		justifyContent: "center",
	},
	channelName: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 4,
	},
	channelSubscribers: {
		color: "#aaa",
		fontSize: 13,
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
});
