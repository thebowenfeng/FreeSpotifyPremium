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
    let [sliderValue, setSliderValue] = useState(0)
    let [currentSong, setCurrentSong] = useState(null)
    let [sound, setSound] = useState(null)

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
     

    return(
        <View style={styles.container}>
            <Text style={{fontSize: 25, marginBottom: 20}}>
                {playlistInfo != null && playlistInfo.name}
            </Text>
            <View style={styles.inputWrap}>
                <Text style={{fontSize:15, marginRight: 120, marginTop: 10}}>
                    Download
                </Text>
                <Switch value={false}/>
            </View>
            <ScrollView style={{flex: 1, width: "100%"}}>
                {tracks != null && tracks.map((song) => {
                    return(
                        <Drawer.Item
                            style={{ backgroundColor: '#64ffda' }}
                            icon="play"
                            label={song.track.name + " - " + song.track.artists[0].name}
                            onPress={() => {
                                axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${song.track.name + " - " + song.track.artists[0].name}&type=video&maxResults=1&key=${APIkey}`).then(async (response) => {
                                    const youtubeURL = `http://www.youtube.com/watch?v=${response.data.items[0].id.videoId}`;
                                    const urls = await ytdl(youtubeURL, { filter: "audioonly" });
                                    setCurrentSong(song.track.name + " - " + song.track.artists[0].name)

                                    navigation.navigate("MusicPlayerView", {url: urls[0].url})
                                }).catch((error) => {
                                    console.log(error)
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
