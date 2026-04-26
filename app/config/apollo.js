import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import * as SecureStore from "expo-secure-store";

const serverUrl = new URL(process.env.EXPO_PUBLIC_SERVER_URI).toString();

const httpLink = new HttpLink({
  uri: serverUrl,
});

const authLink = new SetContextLink(async ({ headers }) => {
  const token = await SecureStore.getItemAsync("access_token");

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;
