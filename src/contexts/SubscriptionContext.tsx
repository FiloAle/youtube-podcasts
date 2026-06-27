import { ChannelInfo, youtubeService } from "@/lib/youtube";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface SubscriptionContextType {
	subscriptions: ChannelInfo[];
	toggleSubscription: (channel: ChannelInfo) => void;
	isSubscribed: (id: string) => boolean;
	refreshSubscriptions: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
	const [subscriptions, setSubscriptions] = useState<ChannelInfo[]>([]);

	useEffect(() => {
		const loadSubscriptions = async () => {
			try {
				const stored = await AsyncStorage.getItem("subscriptions");
				if (stored) {
					setSubscriptions(JSON.parse(stored));
				}
			} catch (e) {
				console.error("Failed to load subscriptions", e);
			}
		};
		loadSubscriptions();
	}, []);

	const saveSubscriptions = async (newSubs: ChannelInfo[]) => {
		setSubscriptions(newSubs);
		try {
			await AsyncStorage.setItem("subscriptions", JSON.stringify(newSubs));
		} catch (e) {
			console.error("Failed to save subscriptions", e);
		}
	};

	const toggleSubscription = (channel: ChannelInfo) => {
		const isSub = subscriptions.some((s) => s.id === channel.id);
		let newSubs;
		if (isSub) {
			newSubs = subscriptions.filter((s) => s.id !== channel.id);
		} else {
			newSubs = [...subscriptions, channel];
		}
		saveSubscriptions(newSubs);
	};

	const isSubscribed = (id: string) => {
		return subscriptions.some((s) => s.id === id);
	};

	const refreshSubscriptions = async () => {
		if (subscriptions.length === 0) return;
		try {
			const results = await Promise.allSettled(
				subscriptions.map((sub) => youtubeService.getChannelInfo(sub.id)),
			);

			const updatedSubs = subscriptions.map((sub, i) => {
				const result = results[i];
				if (result.status === "fulfilled") {
					return result.value;
				}
				return sub;
			});

			await saveSubscriptions(updatedSubs);
		} catch (e) {
			console.error("Failed to refresh subscriptions", e);
		}
	};

	return (
		<SubscriptionContext.Provider
			value={{
				subscriptions,
				toggleSubscription,
				isSubscribed,
				refreshSubscriptions,
			}}
		>
			{children}
		</SubscriptionContext.Provider>
	);
}

export function useSubscriptions() {
	const context = useContext(SubscriptionContext);
	if (!context) {
		throw new Error(
			"useSubscriptions must be used within a SubscriptionProvider",
		);
	}
	return context;
}
