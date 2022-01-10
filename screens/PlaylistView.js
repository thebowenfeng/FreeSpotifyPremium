import {SafeAreaView, ScrollView, StyleSheet, View} from "react-native";
import axios from "axios";
import {Divider, Switch, Snackbar} from "react-native-paper";
import {useContext, useEffect, useState} from "react";
import {Text} from 'react-native'

import {ApiTokenContext} from "../contexts/ApiTokenContext";


export default function PlaylistView({route, navigation}){
    const {playlistID} = route.params
    let [token, setToken] = useContext(ApiTokenContext)
    let [playlistInfo, setPlaylistInfo] = useState(null)
    let [tracks, setTracks] = useState(null)
    let [nextPage, setNextPage] = useState(null)
    let [snackBarVis, setSnackBarVis] = useState(false)

    useEffect(() => {
        axios.get(`https://api.spotify.com/v1/playlists/${playlistID}`, {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
            setPlaylistInfo(resp.data)
            setTracks(resp.data.tracks.items)
            setNextPage(resp.data.tracks.next)
        }).catch((err) => {
            alert(err)
        })
    }, [])

    const isCloseToBottom = ({layoutMeasurement, contentOffset, contentSize}) => {
        const paddingToBottom = 5;
        return layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;
    };

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
            <ScrollView style={{flex: 1}} onScroll={
                ({nativeEvent}) => {
                    if(isCloseToBottom(nativeEvent)){
                        if(nextPage != null){
                            setSnackBarVis(true)
                            axios.get(nextPage, {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
                                var newTracks = [...tracks, ...resp.data.items]
                                setTracks(newTracks)
                                setNextPage(resp.data.next)
                            })
                        }
                    }
                }
            }>
                {tracks != null && tracks.map((song) => {
                    return(
                        <Text> {song.track.name} </Text>
                        )
                })}
            </ScrollView>
            <Snackbar
                visible={snackBarVis}
                onDismiss={() => {
                    setSnackBarVis(false)
                }}
                action={{
                    label: 'Dismiss',
                    onPress: () => {setSnackBarVis(false)}
                }}
                duration={1000}
            >
                Loading more songs...
            </Snackbar>
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
