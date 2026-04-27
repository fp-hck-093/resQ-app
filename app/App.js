import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ApolloProvider } from "@apollo/client/react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { TouchableOpacity, View, StyleSheet } from "react-native";

import client from "./config/apollo";

// Auth Screens
import ForgotPasswordScreen from "./screens/auth/ForgotPasswordScreen";
import LoginScreen from "./screens/auth/LoginScreen";
import RegisterScreen from "./screens/auth/RegisterScreen";
import ResetPasswordScreen from "./screens/auth/ResetPasswordScreen";

// Main Screens
import HomeScreen from "./screens/main/HomeScreen";
import RequestsScreen from "./screens/main/RequestScreen";
import ActivityScreen from "./screens/main/ActivityScreen";
import ProfileScreen from "./screens/main/ProfileScreen";
import LocationsScreen from "./screens/main/LocationsScreen";
import CreateScreen from "./screens/main/CreateScreen";

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

// Custom Create Button
function CustomCreateButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.createBtn} onPress={onPress}>
      <View style={styles.createBtnInner}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#3b5fca",
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
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "MapTab") {
            iconName = focused ? "map" : "map-outline";
          } else if (route.name === "Requests") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Locations") {
            iconName = focused ? "location" : "location-outline";
          } else if (route.name === "Activity") {
            iconName = focused ? "clipboard" : "clipboard-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="MapTab"
        component={HomeScreen}
        options={{ tabBarLabel: "Map" }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{ tabBarLabel: "Requests" }}
      />
      <Tab.Screen
        name="Create"
        component={CreateScreen}
        options={{
          tabBarLabel: "",
          tabBarButton: (props) => (
            <CustomCreateButton onPress={props.onPress} />
          ),
        }}
      />
      <Tab.Screen
        name="Locations"
        component={LocationsScreen}
        options={{ tabBarLabel: "Locations" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("access_token").then((token) => {
      setIsLoggedIn(!!token);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#3b5fca" }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            initialRouteName={isLoggedIn ? "Home" : "Login"}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="Home" component={MainTabs} />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="auto" />
      </ApolloProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    top: -20,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});