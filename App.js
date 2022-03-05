import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "react-native-screens/native-stack";
import {Provider as PaperProvider} from 'react-native-paper'
import {useState} from "react";
import {GestureHandlerRootView} from "react-native-gesture-handler";

import SpotifyLogin from "./screens/SpotifyLogin";
import MainPage from "./screens/MainPage";
import LoginWebView from './screens/LoginWebView'
import PlaylistView from "./screens/PlaylistView";

import {ApiTokenContext} from "./contexts/ApiTokenContext";

const Stack = createNativeStackNavigator();

export default function App() {
    let [token, setToken] = useState(null);

  return (
      <GestureHandlerRootView style={{flex: 1}}>
          <ApiTokenContext.Provider value={[token, setToken]}>
              <PaperProvider>
                  <NavigationContainer>
                      <Stack.Navigator initialRouteName={"SpotifyLogin"}>
                          <Stack.Screen name={"SpotifyLogin"} component={SpotifyLogin}/>
                          <Stack.Screen name={"LoginWebView"} component={LoginWebView}/>
                          <Stack.Screen name={"Playlists"} component={MainPage}/>
                          <Stack.Screen name={"PlaylistView"} component={PlaylistView}/>
                      </Stack.Navigator>
                  </NavigationContainer>
              </PaperProvider>
          </ApiTokenContext.Provider>
      </GestureHandlerRootView>
  );
}
