import { StyleSheet, View } from 'react-native';
import {Button} from "react-native-paper"
import {DefaultTheme} from 'react-native-paper'
import React from "react";
import {useContext} from "react";

import {ApiTokenContext} from "../contexts/ApiTokenContext";

export default function SpotifyLogin({navigation}) {
    let [token, setToken] = useContext(ApiTokenContext)

    if(token != null){
        navigation.navigate("Playlists")
    }

    return (
        <View style={styles.container}>
            <Button icon={{uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/768px-Spotify_logo_without_text.svg.png"}}
                    mode="contained" theme={btnTheme} labelStyle={{color: "white"}}
                    onPress={() => navigation.navigate("LoginWebView")}>
                Login to Spotify
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const btnTheme = {
    ...DefaultTheme,
    colors:{
        primary: "#1ed760",
    }
}
