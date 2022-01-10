import {WebView} from 'react-native-webview'
import {useContext} from "react";

import {ApiTokenContext} from "../contexts/ApiTokenContext";

export default function LoginWebView({navigation}) {
    var authURL = 'https://accounts.spotify.com/authorize';
    authURL += '?response_type=token';
    authURL += '&client_id=a0109ec595854998990fb3f66b011173';
    authURL += '&scope=playlist-read-collaborative playlist-modify-public';
    authURL += '&redirect_uri=https://google.com';

    const [token, setToken] = useContext(ApiTokenContext)

    return (
        <WebView
            source={{uri: authURL}}
            incognito={false}
            onNavigationStateChange={(state) => {
                if(state.url.includes("https://www.google.com")){
                    let token_index = state.url.indexOf("access_token") + 13
                    let end_index = state.url.indexOf("&")

                    setToken(state.url.slice(token_index, end_index))
                    navigation.navigate("SpotifyLogin")
                }
            }
            }
        />
    );
}
