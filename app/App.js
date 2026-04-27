import React from "react";
import { ApolloProvider } from "@apollo/client/react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import client from "./config/apollo";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";

const Stack = createNativeStackNavigator();

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

export default function App() {
  return (
    <SafeAreaProvider>
    <ApolloProvider client={client}>
      <NavigationContainer linking={linking}>
        <Stack.Navigator initialRouteName="Register" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </ApolloProvider>
    </SafeAreaProvider>
  );
}
