import {ScrollView, StyleSheet, View} from "react-native";
import axios from "axios";
import {Switch, Drawer, Button} from "react-native-paper";
import {useContext, useEffect, useState} from "react";
import {Text} from 'react-native'
import {APIkey} from "../config";
import ytdl from "react-native-ytdl"

import {ApiTokenContext} from "../contexts/ApiTokenContext";


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
            axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${song.track.name + " - " + song.track.artists[0].name}&type=video&maxResults=1&key=${APIkey}`).then(async (response) => {
                const youtubeURL = `http://www.youtube.com/watch?v=${response.data.items[0].id.videoId}`;
                const urls = await ytdl(youtubeURL, { filter: "audioonly" });

                navigation.navigate("MusicPlayerView", {
                    url: urls[0].url,
                    songName: song.track.name + " - " + song.track.artists[0].name,
                    setSongState: [songIndex, setSongIndex],
                    playListMax: tracks.length,
                    setIsPlaying: setIsPlaying})
            }).catch((error) => {
                console.log("bruh")
            })
        }
    }, [songIndex])

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

    return(
        <View style={styles.container}>
            <Text style={{fontSize: 25, marginBottom: 20}}>
                {playlistInfo != null && playlistInfo.name}
            </Text>
            <View style={styles.inputWrap}>
                <Button
                    onPress={() => {
                        setIsPlaying(true)
                        setIsShuffle(false)
                        if(songIndex === null){
                            setSongIndex(0)
                        }else{
                            setSongIndex(songIndex + 1)
                        }
                    }}
                    disabled={isPlaying}
                >Play</Button>
                <Button
                    onPress={() => {
                        setIsPlaying(true)
                        setIsShuffle(true)
                        setSongIndex(getRandomInt(tracks.length))
                    }}
                    disabled={isPlaying}
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
                            onPress={() => {
                                axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${song.track.name + " - " + song.track.artists[0].name}&type=video&maxResults=1&key=${APIkey}`).then(async (response) => {
                                    const youtubeURL = `http://www.youtube.com/watch?v=${response.data.items[0].id.videoId}`;
                                    const urls = await ytdl(youtubeURL, { filter: "audioonly" });

                                    navigation.navigate("MusicPlayerView", {
                                        url: urls[0].url,
                                        songName: song.track.name + " - " + song.track.artists[0].name,
                                        setSongState: [songIndex, setSongIndex],
                                        isShuffle: isShuffle,
                                        playListMax: tracks.length,
                                        setIsPlaying: setIsPlaying})
                                }).catch((error) => {
                                    console.log(error.response)
                                })
                            }}
                        />
                        )
                })}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
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
