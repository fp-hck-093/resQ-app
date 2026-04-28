import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ApolloProvider } from "@apollo/client/react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { gql } from "@apollo/client";
import client from "./config/apollo";
import { registerForPushNotificationsAsync } from "./utils/notifications";

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

const serverHost = (process.env.EXPO_PUBLIC_SERVER_URI ?? "")
  .replace("/graphql", "")
  .replace(/:3000$/, ":8081/--")
  .replace("http://", "exp://");

const linking = {
  prefixes: ["resq://", serverHost, "exp://localhost:8081/--"].filter(Boolean),
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
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelPosition: "below-icon",
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#3b5fca",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          height: 62 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 14,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 2,
        },
        tabBarItemStyle: {
          height: 58,
          paddingTop: 4,
          paddingBottom: 2,
          justifyContent: "center",
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
          return <Ionicons name={iconName} size={24} color={color} />;
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
          tabBarItemStyle: {
            height: 78,
          },
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

const SAVE_PUSH_TOKEN = gql`
  mutation SavePushToken($token: String!) {
    savePushToken(token: $token)
  }
`;

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync("access_token").then((token) => {
      setIsLoggedIn(!!token);
      setIsLoading(false);

      if (token) {
        registerForPushNotificationsAsync().then((pushToken) => {
          if (!pushToken) return;
          client.mutate({
            mutation: SAVE_PUSH_TOKEN,
            variables: { token: pushToken },
          });
        });
      }
    });
  }, []);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#3b5fca",
        }}
      >
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
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
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
    top: -30,
    justifyContent: "center",
    alignItems: "center",
    width: 82,
    height: 82,
  },
  createBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffffff",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
});
