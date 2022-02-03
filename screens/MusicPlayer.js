import {WebView} from "react-native-webview";
import {View} from "react-native-web";
import {useEffect, useState} from "react";

export default function MusicPlayer({route, navigation}){
    const {url} = route.params
    const [songIndex, setSongIndex] = route.params.setSongState
    var userGoBack = true;

    useEffect(() => {
        navigation.addListener('beforeRemove', (e) => {
            e.preventDefault()
            if(userGoBack){
                setSongIndex(null)
            }else{
                if(route.params.isShuffle){
                    setSongIndex(getRandomInt(route.params.playListMax))
                }else{
                    setSongIndex(songIndex + 1)
                }

            }
            navigation.dispatch(e.data.action)
        })
    }, [navigation])

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    const runFirst = `
      document.getElementsByName('media')[0].addEventListener('ended',function() { window.ReactNativeWebView.postMessage("Hello!"); },false);
      true; // note: this is required, or you'll sometimes get silent failures
    `;
    return (
        <WebView
            source={{
                uri: url,
            }}
            onMessage={(event) => {
                userGoBack = false
                navigation.goBack()
            }}
            injectedJavaScript={runFirst}
        />
    )
}
