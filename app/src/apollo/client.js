import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';

const serverUrl = new URL('/graphql', process.env.EXPO_PUBLIC_SERVER_URI).toString();

const httpLink = new HttpLink({
  uri: serverUrl,
});

const authLink = new SetContextLink(({ headers }) => {
  const token = SecureStore.getItem('access_token');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default client;
