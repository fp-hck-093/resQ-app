import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import client from "./config/apollo";

// Auth Screens
import ForgotPasswordScreen from "./screens/auth/ForgotPasswordScreen";
import LoginScreen from "./screens/auth/LoginScreen";
import RegisterScreen from "./screens/auth/RegisterScreen";
import ResetPasswordScreen from "./screens/auth/ResetPasswordScreen";

// Main Screens
import HomeScreen from "./screens/main/HomeScreen";
import RequestsScreen from "./screens/main/RequestsScreen";
import ActivityScreen from "./screens/main/ActivityScreen";
import ProfileScreen from "./screens/main/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: ["resq://", "exp://10.0.2.2:8081/--", "exp://localhost:8081/--"],
  config: {
    screens: {
      ResetPassword: {
        path: "reset-password",
        parse: { token: String, id: String },
      },
    },
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#3B5BDB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Requests") {
            iconName = focused ? "alert-circle" : "alert-circle-outline";
          } else if (route.name === "Activity") {
            iconName = focused ? "clipboard" : "clipboard-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: "Map" }} />
      <Tab.Screen name="Requests" component={RequestsScreen} options={{ tabBarLabel: "Requests" }} />
      <Tab.Screen name="Activity" component={ActivityScreen} options={{ tabBarLabel: "Activity" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: "Profile" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            initialRouteName="Register"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="Home" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </ApolloProvider>
    </SafeAreaProvider>
  );
}