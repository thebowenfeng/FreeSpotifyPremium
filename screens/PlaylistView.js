import {ScrollView, StyleSheet, View} from "react-native";
import axios from "axios";
import {Switch, Drawer, Button} from "react-native-paper";
import {useContext, useEffect, useState} from "react";
import {Text} from 'react-native'
import ytdl from "react-native-ytdl"

import {ApiTokenContext} from "../contexts/ApiTokenContext";
import {WebView} from "react-native-webview";
import HTMLParser from "fast-html-parser";

export default function PlaylistView({route, navigation}){
    const {playlistID} = route.params
    let [token, setToken] = useContext(ApiTokenContext)
    let [playlistInfo, setPlaylistInfo] = useState(null)
    let [tracks, setTracks] = useState(null)
    let [nextPage, setNextPage] = useState(null)
    let [displayLimit, setDisplayLimit] = useState(20)
    let [songIndex, setSongIndex] = useState(null)
    let [isShuffle, setIsShuffle] = useState(false)
    let [isPlaying, setIsPlaying] = useState(false)
    let [currVidID, setCurrVidID] = useState(null)
    let [currSong, setCurrSong] = useState(null);
    let [startSearch, setStartSearch] = useState(false);
    let [songSwitch, setSongSwitch] = useState(0);

    useEffect(() => {
        axios.get(`https://api.spotify.com/v1/playlists/${playlistID}`, {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
            setPlaylistInfo(resp.data)
            setTracks(resp.data.tracks.items)
            setNextPage(resp.data.tracks.next)
        }).catch((err) => {
            alert(err)
        })
    }, [])


    useEffect(() => {
        if(nextPage != null){
            axios.get(nextPage, {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
                var newTracks = [...tracks, ...resp.data.items]
                setTracks(newTracks)
                setNextPage(resp.data.next)
            })
        }
    }, [nextPage])

    useEffect(() => {
        if(songIndex != null && isPlaying){
            var song = tracks[songIndex];
            setCurrSong(song)
            setStartSearch(true);
            navigation.removeListener('beforeRemove', checkSearchStatus)
        }
    }, [songSwitch])

    useEffect(async () => {
        if(currVidID != null){
            const youtubeURL = `http://www.youtube.com${currVidID}`;
            const urls = await ytdl(youtubeURL, { filter: "audioonly" });

            navigation.navigate("MusicPlayerView", {
                url: urls[0].url,
                songName: currSong.track.name + " - " + currSong.track.artists[0].name,
                setSongState: [songIndex, setSongIndex],
                setSwitch: [songSwitch, setSongSwitch],
                isShuffle: isShuffle,
                playListMax: tracks.length,
                setIsPlaying: setIsPlaying,
                setID: setCurrVidID
            })
        }
    }, [currVidID])

    const checkSearchStatus = (e) => {
        e.preventDefault()
        if(!startSearch){
            navigation.dispatch(e.data.action)
        }
    }

    useEffect(() => {
        navigation.addListener('beforeRemove', checkSearchStatus)
    }, [navigation, startSearch])

    var trackDisplayed = []

    if(tracks != null){
        for(var i = 0; i < displayLimit; i++){
            if(i === tracks.length){
                break;
            }
            trackDisplayed.push(tracks[i])
        }
    }

    const isCloseToBottom = ({layoutMeasurement, contentOffset, contentSize}) => {
        const paddingToBottom = 20;
        return layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;
    };

    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    const runFirst = `
    setInterval(function () {window.ReactNativeWebView.postMessage(document.documentElement.outerHTML)}, 100);
      true; // note: this is required, or you'll sometimes get silent failures
    `;

    function renderPage(){
        if(tracks != null){
            if(!startSearch){
                return (
                    <View style={styles.container}>
                        <Text style={{fontSize: 25, marginBottom: 20}}>
                            {playlistInfo != null && playlistInfo.name}
                        </Text>
                        <View style={styles.inputWrap}>
                            <Button
                                onPress={() => {
                                    setIsPlaying(true)
                                    setIsShuffle(false)
                                    if(songIndex === null || songIndex >= tracks.length - 1){
                                        setSongIndex(0)
                                    }else{
                                        setSongIndex(songIndex + 1)
                                    }
                                    setSongSwitch(songSwitch + 1)
                                }}
                                disabled={isPlaying || tracks.length === 0}
                            >Play</Button>
                            <Button
                                onPress={() => {
                                    setIsPlaying(true)
                                    setIsShuffle(true)
                                    setSongIndex(getRandomInt(tracks.length))
                                    setSongSwitch(songSwitch + 1)
                                }}
                                disabled={isPlaying || tracks.length === 0}
                            >Shuffle Play</Button>
                        </View>
                        <ScrollView
                            style={{flex: 1, width: "100%"}}
                            onScroll={({nativeEvent}) => {
                                if (isCloseToBottom(nativeEvent)) {
                                    if(displayLimit + 20 > tracks.length){
                                        setDisplayLimit(tracks.length)
                                    }else{
                                        setDisplayLimit(displayLimit + 20)
                                    }
                                }
                            }}
                        >
                            {tracks != null && trackDisplayed.map((song) => {
                                return(
                                    <Drawer.Item
                                        style={{ backgroundColor: '#64ffda' }}
                                        icon="play"
                                        label={song.track.name + " - " + song.track.artists[0].name}
                                        onPress={async () => {
                                            setCurrSong(song)
                                            setStartSearch(true);
                                            navigation.removeListener('beforeRemove', checkSearchStatus)
                                        }}
                                    />
                                )
                            })}
                        </ScrollView>
                    </View>
                )
            }else{
                return (
                    <View style={{
                        maxHeight: "1%",
                        height: "1%"
                    }}>
                        <WebView
                            source={{
                                uri: `https://www.youtube.com/results?search_query=${currSong.track.name + " - " + currSong.track.artists[0].name}`,
                            }}
                            onMessage={(event) => {

                                var HTMLParser = require('fast-html-parser');
                                var root = HTMLParser.parse(event.nativeEvent.data)
                                if(root.querySelector("ytm.item") != null && root.querySelector("ytm.item") !== undefined){
                                    var htmlElem = root.querySelector("ytm.item").firstChild.firstChild.rawAttrs
                                    setCurrVidID(htmlElem.toString().slice(htmlElem.toString().indexOf("href=") + 6, -1))
                                    setStartSearch(false)
                                }
                            }}
                            injectedJavaScript={runFirst}
                            onHttpError={(e) => {
                                alert("Unknown HTTP error")
                                setStartSearch(false)
                            }}
                        />
                    </View>
                )
            }
        }else{
            return(
                <Text>Loading...</Text>
            )
        }
    }

    return(
        <View style={styles.bigcontainer}>
            {renderPage()}
        </View>
    )
}

const styles = StyleSheet.create({
    bigcontainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    inputWrap: {
        flex: 1,
        flexWrap: 'wrap',
        flexDirection: "row",
        maxHeight: '7%'
    }
});
