import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
	const scheme = useColorScheme();
	const colors = Colors[scheme === "unspecified" ? "light" : scheme];

	return (
		<NativeTabs backgroundColor={colors.background} tintColor="#C480F0">
			<NativeTabs.Trigger name="home">
				<NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="house.fill" md="home" />
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="followed">
				<NativeTabs.Trigger.Label>Seguiti</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="rectangle.stack.fill" md="subscriptions" />
			</NativeTabs.Trigger>

			<NativeTabs.Trigger name="search">
				<NativeTabs.Trigger.Label>Ricerca</NativeTabs.Trigger.Label>
				<NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
			</NativeTabs.Trigger>
		</NativeTabs>
	);
}
