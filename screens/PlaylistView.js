import {ScrollView, StyleSheet, View} from "react-native";
import axios from "axios";
import {Switch, Drawer, Button, IconButton} from "react-native-paper";
import {useContext, useEffect, useState, useRef} from "react";
import {Text} from 'react-native'
import {Audio} from 'expo-av'
import * as FileSystem from 'expo-file-system'
import MultiSlider from "@ptomasroos/react-native-multi-slider";

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
    let [currSong, setCurrSong] = useState(null);
    let [songSwitch, setSongSwitch] = useState(0);
    let [songObj, setSongObj] = useState(null)
    let [currSongLength, setCurrSongLength] = useState(0)
    let [scrollBarPos, setScrollBarPos] = useState(0)
    let [pause, setPause] = useState(true)
    let [isLoaded, setIsLoaded] = useState(false)
    let [transition, setTransition] = useState(false)
    let [isDownload, setIsDownload] = useState(false)
    let [downloadedSongs, setDownloadedSongs] = useState([])
    let [shuffleRand, setShuffleRand] = useState(null);

    const downloadRef = useRef(false)
    const componentMounted = useRef(true);

    useEffect(() => {
        Audio.setAudioModeAsync({
            staysActiveInBackground: true
        })

        FileSystem.getInfoAsync(FileSystem.documentDirectory + '/temp').then((result) => {
            if(!result.exists || !result.isDirectory){
                FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + "/temp")
            }
        })

        FileSystem.readDirectoryAsync(FileSystem.documentDirectory).then(async (result) => {
            /*
            for(var i = 0; i < result.length; i++){
                var elem = result[i]
                if(elem !== "temp"){
                    await FileSystem.deleteAsync(FileSystem.documentDirectory + elem);
                    console.log("deleted")
                }
            }
            */
            componentMounted.current && setDownloadedSongs(result)
        })

        axios.get(`https://api.spotify.com/v1/playlists/${playlistID}`, {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
            if(componentMounted.current){
                setPlaylistInfo(resp.data)
                setTracks(resp.data.tracks.items)
                setNextPage(resp.data.tracks.next)
            }
        }).catch((err) => {
            alert(err)
        })

        return async () => {
            console.log("Component unmounted!")
            if(songObj != null){
                await songObj.unloadAsync()
            }

            componentMounted.current = false;
            downloadRef.current = false;
        }
    }, [])

    useEffect(() => {
        if(nextPage != null){
            axios.get(nextPage, {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
                if(componentMounted.current){
                    var newTracks = [...tracks, ...resp.data.items]
                    setTracks(newTracks)
                    setNextPage(resp.data.next)
                }
            })
        }
    }, [nextPage])

    /*
    useEffect(() => {
        navigation.addListener('beforeRemove', (e) => {
            e.preventDefault()
            navigation.dispatch(e.data.action)
        })
    }, [navigation])
     */

    useEffect(async () => {
        if(songIndex != null && componentMounted.current){
            if(isShuffle){
                setShuffleRand(getRandomInt(tracks.length))
            }

            var contents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "temp/")
            var downloadedContents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)

            var song = tracks[songIndex];
            var songName = `${song.track.name + " - " + song.track.artists[0].name}`
            songName.replace("/", "")

            var URL = `http://34.129.153.202:3000/get_music?name=${songName}`
            var localURI = FileSystem.documentDirectory + `temp/${songName}.mp3`

            if(downloadedContents.includes(`${songName}.mp3`)){
                localURI = FileSystem.documentDirectory + `${songName}.mp3`
            }

            if(contents.includes(`${songName}.mp3`) || downloadedContents.includes(`${songName}.mp3`)){
                setIsLoaded(false)
                await songObj.unloadAsync()
                console.log("unloaded")
                await songObj.loadAsync({uri: localURI})
                console.log("loaded")
                await songObj.playAsync()
                console.log("playing")

                setIsLoaded(true)

                await songObj.getStatusAsync().then((result) => {
                    setCurrSongLength(result.durationMillis)
                })

                await songObj.setStatusAsync({progressUpdateIntervalMillis: 1000})
                await songObj.setOnPlaybackStatusUpdate(songCallback)
                setCurrSong(song)
                setPause(false)
                setTransition(false)
            }
            else{
                if(contents.length > 0){
                    await FileSystem.deleteAsync(FileSystem.documentDirectory + `temp/${contents[0]}`)
                }

                console.log(`Begin loading new song ${songName}`)
                FileSystem.downloadAsync(URL, localURI).then(async ({uri}) => {
                    setIsLoaded(false)
                    console.log("Finished downloading to: " + uri)
                    await songObj.unloadAsync()
                    console.log("unloaded")
                    await songObj.loadAsync({uri: uri})
                    console.log("loaded")
                    await songObj.playAsync()
                    console.log("playing")

                    setIsLoaded(true)

                    await songObj.getStatusAsync().then((result) => {
                        setCurrSongLength(result.durationMillis)
                    })

                    await songObj.setStatusAsync({progressUpdateIntervalMillis: 1000})
                    await songObj.setOnPlaybackStatusUpdate(songCallback)
                    setCurrSong(song)
                    setPause(false)
                    setTransition(false)
                })
            }
        }
    }, [songSwitch])

    useEffect(async () => {
        var tempDownloaded = []

        downloadRef.current = isDownload;
        if(isDownload){
            console.log("initiated download attempt")
            if(tracks != null){
                for(var i = 0; i < tracks.length; i++){
                    var song = tracks[i];
                    var dirContents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)

                    if (!downloadRef.current){
                        console.log("detected break")
                        break;
                    }

                    var songName = `${song.track.name + " - " + song.track.artists[0].name}`;
                    songName.replace("/", "");

                    if (!dirContents.includes(songName + ".mp3") && isDownload){
                        console.log("Downloading " + songName)
                        var URL = `http://34.129.153.202:3000/get_music?name=${songName}`
                        var localURI = FileSystem.documentDirectory + `${songName}.mp3`

                        var {uri} = await FileSystem.downloadAsync(URL, localURI)
                        if(componentMounted.current){
                            console.log(`${songName} downloaded to ` + uri);
                            tempDownloaded.push(songName + ".mp3")
                            setDownloadedSongs([...downloadedSongs, ...tempDownloaded])
                        }
                    }
                }
            }
        }
    }, [isDownload])

    var trackDisplayed = []

    if(songObj == null){
        const sound = new Audio.Sound()
        setSongObj(sound)
    }

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

    function renderSongName() {
        if(currSong == null){
            return "No song playing"
        }else{
            return currSong.track.name + " - " + currSong.track.artists[0].name
        }
    }

    function renderPlayPauseButton(){
        var imageURL = "";

        if(pause === true){
            imageURL = 'https://cdn-icons-png.flaticon.com/512/483/483054.png';
        }else{
            imageURL = 'https://cdn-icons-png.flaticon.com/512/16/16427.png';
        }

        return(
            <IconButton
                icon={{uri: imageURL}}
                size={40}
                onPress={() => {
                    if(isLoaded){
                        if(pause === true){
                            songObj.playAsync()
                        }else{
                            songObj.pauseAsync()
                        }
                        setPause(!pause)
                    }

                }}
            />
        )
    }

    function skipSong(forward){
        if(isPlaying || (!isPlaying && !isShuffle)){
            if(songIndex == null){
                setSongIndex(0)
            }
            else if(forward){
                if(songIndex >= tracks.length - 1){
                    setSongIndex(0)
                }else{
                    setSongIndex(songIndex + 1)
                }
            }else{
                if(songIndex === 0){
                    setSongIndex(tracks.length - 1)
                }else{
                    setSongIndex(songIndex - 1)
                }
            }
            setSongSwitch(songSwitch + 1)
        }else if(isShuffle){
            setSongIndex(getRandomInt(tracks.length))
            setSongSwitch(songSwitch + 1)
        }
    }

    function checkIsDownloaded(song){
        var songName = `${song.track.name + " - " + song.track.artists[0].name}`;
        songName.replace("/", "");

        return downloadedSongs.includes(songName + ".mp3")
    }

    function songCallback(status){
        var pos = Math.floor(status.positionMillis / status.durationMillis * 100);
        var nextSongIndex = null;

        if(pos >= 93 && !transition){
            if(isPlaying){
                if(songIndex === null || songIndex >= tracks.length - 1){
                    nextSongIndex = 0
                }else{
                    nextSongIndex = songIndex + 1
                }
            }else if(isShuffle){
                nextSongIndex = shuffleRand;
            }

            if(isPlaying || isShuffle){
                if(checkIsDownloaded(tracks[nextSongIndex])){
                    if(pos >= 99){
                        setSongIndex(nextSongIndex)
                        setSongSwitch(songSwitch + 1)
                        setTransition(true)
                    }
                }else{
                    setSongIndex(nextSongIndex)
                    setSongSwitch(songSwitch + 1)
                    setTransition(true)
                }
            }
        }

        if(pos >= 1){
            setScrollBarPos(pos)
        }
    }

    function renderPage(){
        if(tracks != null){
            return (
                <View style={styles.container}>
                    <Text style={{fontSize: 25, marginBottom: 20}}>
                        {playlistInfo != null && playlistInfo.name}
                    </Text>
                    <View style={styles.inputWrap}>
                        <Button
                            onPress={() => {
                                if(isPlaying){
                                    setIsPlaying(false)
                                }else{
                                    setIsPlaying(true)
                                    setIsShuffle(false)
                                    if(songIndex === null || songIndex >= tracks.length - 1){
                                        setSongIndex(0)
                                    }else{
                                        setSongIndex(songIndex + 1)
                                    }
                                    setSongSwitch(songSwitch + 1)
                                }
                            }}
                            disabled={isShuffle || tracks.length === 0}
                        >{isPlaying ? "Stop Play" : "Play"}</Button>
                        <Button
                            onPress={() => {
                                if (isShuffle){
                                    setIsShuffle(false)
                                }else{
                                    setIsPlaying(false)
                                    setIsShuffle(true)
                                    setSongIndex(getRandomInt(tracks.length))
                                    setSongSwitch(songSwitch + 1)
                                }

                            }}
                            disabled={isPlaying || tracks.length === 0}
                        >{isShuffle ? "Stop Shuffle Play" : "Shuffle Play"}</Button>
                    </View>
                    <View style={{
                        flex: 1,
                        flexWrap: 'wrap',
                        flexDirection: "row",
                        maxHeight: '5%',
                        marginTop: '-3%'
                    }}>
                        <Text style={{
                            marginTop: 7,
                            fontSize: 17
                        }}>Download: </Text>
                        <Switch value={isDownload} onValueChange={() => {setIsDownload(!isDownload)}} style={{
                            marginTop: -5
                        }}/>
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
                            var color = ""
                            var fontColor = ""

                            var songName = `${song.track.name + " - " + song.track.artists[0].name}`;
                            songName.replace("/", "");

                            if(!downloadedSongs.includes(songName + ".mp3")){
                                color = "#ff0000"
                                fontColor = "#ffffff"
                            }else{
                                color = "#64ffda"
                                fontColor = "#000000"
                            }

                            return(
                                <Drawer.Item
                                    style={{backgroundColor: color}}
                                    icon="play"
                                    label={<Text style={{color: fontColor}}>{song.track.name + " - " + song.track.artists[0].name}</Text>}
                                    onPress={() => {
                                        console.log(tracks.indexOf(song))
                                        setSongIndex(tracks.indexOf(song))
                                        setSongSwitch(songSwitch + 1)
                                    }}
                                />
                            )
                        })}
                    </ScrollView>
                    <View style={{
                        flex: 1,
                        maxHeight: '20%',
                        alignItems: "center"
                    }}>
                        <Text style={{fontSize: 20}}>{renderSongName()}</Text>
                        <MultiSlider
                            values={[scrollBarPos]}
                            min={0}
                            max={100}
                            onValuesChangeFinish={(value) => {
                                if(currSong != null && currSongLength !== 0){
                                    songObj.setPositionAsync(Math.floor(0.01 * value * currSongLength))
                                }
                            }}
                        />
                        <View style={{
                            flex: 1,
                            flexWrap: 'wrap',
                            flexDirection: "row",
                            maxHeight: '7%'
                        }}>
                            <IconButton
                                icon={{uri: "https://cdn-icons-png.flaticon.com/512/254/254437.png"}}
                                size={40}
                                onPress={() => {
                                    skipSong(false)
                                }}
                            />
                            {renderPlayPauseButton()}
                            <IconButton
                                icon={{uri: "https://cdn-icons-png.flaticon.com/512/254/254428.png"}}
                                size={40}
                                onPress={() => {
                                    skipSong(true)
                                }}
                            />
                        </View>
                    </View>
                </View>
            )
        }
        else {
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
        maxHeight: '7%',
        marginTop: '-2%'
    }
});
