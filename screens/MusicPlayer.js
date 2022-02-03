import {WebView} from "react-native-webview";
import {View} from "react-native-web";
import {useEffect, useState} from "react";

export default function MusicPlayer({route, navigation}){
    const {url} = route.params
    const [songIndex, setSongIndex] = route.params.setSongState
    var userGoBack = true;
    var pause = false;

    useEffect(() => {
        navigation.addListener('beforeRemove', (e) => {
            e.preventDefault()
            route.params.setID(null);
            if(userGoBack){
                if(!pause){
                    setSongIndex(null);
                }
                route.params.setIsPlaying(false)
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
      document.getElementsByName('media')[0].addEventListener('ended',function() { window.ReactNativeWebView.postMessage("natexit"); },false);
      document.body.style.backgroundColor = "white";
      
      var sheet = document.createElement('style')
      sheet.innerHTML = ".titleDiv {text-align: center;} .buttonDiv {display: flex; flex-direction: row; align-items: center; justify-content: center; column-gap: 10vw}";
      document.body.appendChild(sheet);
      
      const newDiv = document.createElement("div")
      newDiv.classList.add('titleDiv')
      newDiv.innerHTML += '<h1>${route.params.songName}</h1>'
      document.body.insertBefore(newDiv, document.getElementsByName('media')[0])
      
      const newDiv2 = document.createElement("div")
      newDiv2.classList.add('buttonDiv')
      newDiv2.innerHTML += "<button id='pause'>Pause Playlist</button> <button id='cancel'>Cancel Playlist</button>"
      document.body.insertBefore(newDiv2, document.getElementsByName('media')[0])
      
      document.getElementById('pause').addEventListener('click', () => {window.ReactNativeWebView.postMessage("pause");})
      document.getElementById('cancel').addEventListener('click', () => {window.ReactNativeWebView.postMessage("cancel");})
      
      true; // note: this is required, or you'll sometimes get silent failures
    `;
    return (
        <WebView
            source={{
                uri: url,
            }}
            onMessage={(event) => {
                if(event.nativeEvent.data === "natexit"){
                    userGoBack = false
                }else if(event.nativeEvent.data === 'pause'){
                    userGoBack = true
                    pause = true
                }else if(event.nativeEvent.data === 'cancel'){
                    userGoBack = true
                    pause = false
                }
                navigation.goBack()
            }}
            injectedJavaScript={runFirst}
            onHttpError={(e) => {
                alert("Song is temporarily unavailable")
                userGoBack = false
                navigation.goBack()
            }}
        />
    )
}
