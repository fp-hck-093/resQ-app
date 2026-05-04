import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import * as SecureStore from "expo-secure-store";

const serverUrl = new URL(process.env.EXPO_PUBLIC_SERVER_URI).toString();

const httpLink = new HttpLink({
  uri: serverUrl,
});

const authLink = setContext(async (_, { headers }) => {
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
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getActiveBmkgAlerts: { merge: false },
          getActiveDangerZones: { merge: false },
          getDangerZonesNear: { merge: false },
          getDangerZonesForLocations: { merge: false },
          getWeatherLogs: { merge: false },
          getMyLocations: { merge: false },
          getRequests: { merge: false },
          getEarthquakeAlerts: { merge: false },
        },
      },
    },
  }),
});

export default client;
