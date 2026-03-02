import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";

import DashboardScreen from "./src/screens/DashboardScreen";
import FundsScreen from "./src/screens/FundsScreen";
import TradesScreen from "./src/screens/TradesScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

import { useAuthStore } from "./src/lib/auth-store";
import { usePortfolioStore } from "./src/lib/portfolio-store";

const Tab = createBottomTabNavigator();

const COLORS = {
  bg: "#0f172a",
  card: "#1e293b",
  accent: "#6366f1",
  sub: "#94a3b8",
  text: "#f1f5f9",
};

// Simple text-based tab icons
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22 }}>{label}</Text>
  );
}

export default function App() {
  // Hydrate stores on app start
  useEffect(() => {
    useAuthStore.getState().hydrate();
    usePortfolioStore.getState().hydrate();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.card },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: "bold" },
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: "#334155",
            paddingBottom: 8,
            paddingTop: 8,
            height: 88,
          },
          tabBarActiveTintColor: COLORS.accent,
          tabBarInactiveTintColor: COLORS.sub,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            title: "總覽",
            tabBarIcon: ({ focused }) => <TabIcon label="📊" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Funds"
          component={FundsScreen}
          options={{
            title: "資金管理",
            tabBarIcon: ({ focused }) => <TabIcon label="💰" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Trades"
          component={TradesScreen}
          options={{
            title: "交易紀錄",
            tabBarIcon: ({ focused }) => <TabIcon label="📈" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: "帳戶",
            tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
