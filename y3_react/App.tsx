import React from 'react'
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FileView from './(tabs)/FileView.tsx'
import LiveView from './(tabs)/LiveView.tsx'

const Tab = createBottomTabNavigator();

export default function App() {
	return (
		< NavigationContainer >
			<Tab.Navigator>
				<Tab.Screen name="File" component={FileView} />
				<Tab.Screen name="Live" component={LiveView} />
			</Tab.Navigator>
		</NavigationContainer >
	);
}
