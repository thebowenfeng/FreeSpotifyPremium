import {ScrollView, StyleSheet, View} from "react-native";
import axios from "axios";
import {Switch, Drawer, Button, IconButton} from "react-native-paper";
import {useContext, useEffect, useState, useRef, useMemo, useCallback} from "react";
import {Text} from 'react-native'
import {Audio} from 'expo-av'
import * as FileSystem from 'expo-file-system'
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import MusicControl, {Command} from "react-native-music-control";

import {ApiTokenContext} from "../contexts/ApiTokenContext";
import BottomSheet, {BottomSheetView} from "@gorhom/bottom-sheet";

export default function PlaylistView({route, navigation}){
    const {playlistID} = route.params
    let [token, setToken] = useContext(ApiTokenContext)
    let [playlistInfo, setPlaylistInfo] = useState(null)
    let [tracks, setTracks] = useState(null)
    let [nextPage, setNextPage] = useState(null)
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
    let [renderSection, setRenderSection] = useState(0)

    const downloadRef = useRef(false)
    const pauseRef = useRef(true)
    const isPlayingRef = useRef(false)
    const isShuffleRef = useRef(false)
    const songIndexRef = useRef(null);
    const tracksRef = useRef(null)
    const songSwitchRef = useRef(0);
    const shuffleRand = useRef(null);
    const componentMounted = useRef(true);
    const scrollViewRef = useRef(null)

    useEffect(() => {
        Audio.setAudioModeAsync({
            staysActiveInBackground: true
        })

        MusicControl.enableControl('play', true)
        MusicControl.enableControl('pause', true)
        MusicControl.enableControl('stop', false)
        MusicControl.enableControl('nextTrack', true)
        MusicControl.enableControl('previousTrack', true)

        // Changing track position on lockscreen
        MusicControl.enableControl('changePlaybackPosition', true)

        MusicControl.enableControl('seek', true) // Android only

        MusicControl.on(Command.pause, ()=> {
            if(pauseRef.current === true){
                songObj.playAsync()
            }else{
                songObj.pauseAsync()
            }
            pauseRef.current = !pauseRef.current;
            setPause(pauseRef.current)
        })

        MusicControl.on(Command.seek, (pos)=> {
            songObj.setPositionAsync(pos * 1000)
        });

        MusicControl.on(Command.nextTrack, ()=> {
            skipSong(true)
        })

        MusicControl.on(Command.previousTrack, ()=> {
            skipSong(false)
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
                tracksRef.current = resp.data.tracks.items;
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

            MusicControl.stopControl()

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
                    tracksRef.current = newTracks;
                    setNextPage(resp.data.next)
                }
            })
        }
    }, [nextPage])

    useEffect(async () => {
        try{
            var songInfo = null;

            if(songIndex != null && componentMounted.current){
                if(isShuffle){
                    if(tracks.length === 1){
                        shuffleRand.current = 0
                    }else{
                        shuffleRand.current = getRandomInt(tracks.length)
                    }
                }

                var contents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory + "temp/")
                var downloadedContents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)

                var song = tracks[songIndex];
                var songName = `${song.track.name + " - " + song.track.artists[0].name}`
                songName = songName.replace(/[^A-Za-z0-9- ]/g, "");

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

                    songInfo = await songObj.getStatusAsync()
                    setCurrSongLength(songInfo.durationMillis)

                    MusicControl.setNowPlaying({
                        title: songName,
                        duration: songInfo.durationMillis / 1000, // (Seconds)
                        color: 0xff0000, // Android Only - Notification Color
                        colorized: false, // Android 8+ Only - Notification Color extracted from the artwork. Set to false to use the color property instead
                        isLiveStream: false, // iOS Only (Boolean), Show or hide Live Indicator instead of seekbar on lock screen for live streams. Default value is false.
                    })

                    await songObj.setStatusAsync({progressUpdateIntervalMillis: 1000})
                    await songObj.setOnPlaybackStatusUpdate(songCallback)
                    setCurrSong(song)
                    setPause(false)
                    pauseRef.current = false;
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

                        songInfo = await songObj.getStatusAsync()
                        setCurrSongLength(songInfo.durationMillis)

                        MusicControl.setNowPlaying({
                            title: songName,
                            duration: songInfo.durationMillis / 1000, // (Seconds)
                            color: 0xff0000, // Android Only - Notification Color
                            colorized: false, // Android 8+ Only - Notification Color extracted from the artwork. Set to false to use the color property instead
                            isLiveStream: false, // iOS Only (Boolean), Show or hide Live Indicator instead of seekbar on lock screen for live streams. Default value is false.
                        })

                        await songObj.setStatusAsync({progressUpdateIntervalMillis: 1000})
                        await songObj.setOnPlaybackStatusUpdate(songCallback)
                        setCurrSong(song)
                        setPause(false)
                        pauseRef.current = false;
                        setTransition(false)
                    })
                }
            }
        }catch(err){
            alert(err.message)
        }
    }, [songSwitch])

    useEffect(async () => {
        var tempDownloaded = []

        downloadRef.current = isDownload;
        if(isDownload){
            console.log("initiated download attempt")
            if(tracks != null){
                for(var i = 0; i < tracks.length; i++){
                    try{
                        var song = tracks[i];
                        var dirContents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)

                        if (!downloadRef.current){
                            console.log("detected break")
                            break;
                        }

                        var songName = `${song.track.name + " - " + song.track.artists[0].name}`;
                        songName = songName.replace(/[^A-Za-z0-9- ]/g, "");

                        if (!dirContents.includes(songName + ".mp3") && isDownload){
                            console.log("Downloading " + songName)
                            var URL = `http://34.129.153.202:3000/get_music?name=${songName}`
                            var localURI = FileSystem.documentDirectory + `${songName}.mp3`

                            console.log(`localURI: ${localURI}`)

                            var {uri} = await FileSystem.downloadAsync(URL, localURI)
                            if(componentMounted.current){
                                console.log(`${songName} downloaded to ` + uri);
                                tempDownloaded.push(songName + ".mp3")
                                setDownloadedSongs([...downloadedSongs, ...tempDownloaded])
                            }
                        }
                    }catch(err){
                        alert(err.message)
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
        for(var i = renderSection * 5; i < renderSection * 5 + 20; i++){
            if(i === tracks.length){
                break;
            }
            trackDisplayed.push(tracks[i])
        }
    }


    const isCloseToBottom = ({layoutMeasurement, contentOffset, contentSize}) => {
        const paddingToBottom = 0;
        return layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom;
    };

    const isCloseToTop = ({layoutMeasurement, contentOffset, contentSize}) => {
        const paddingToTop = 0;
        return contentOffset.y <= paddingToTop;
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
                        pauseRef.current = !pause;
                        setPause(!pause)
                    }

                }}
            />
        )
    }

    function skipSong(forward){
        if(isPlayingRef.current || (!isPlayingRef.current && !isShuffleRef.current)){
            if(songIndexRef.current == null){
                setSongIndex(0)
                songIndexRef.current = 0;
            }
            else if(forward){
                if(songIndexRef.current >= tracksRef.current.length - 1){
                    setSongIndex(0)
                    songIndexRef.current = 0;
                }else{
                    setSongIndex(songIndexRef.current + 1)
                    songIndexRef.current = songIndexRef.current + 1;
                }
            }else{
                if(songIndexRef.current === 0){
                    setSongIndex(tracksRef.current.length - 1)
                    songIndexRef.current = tracksRef.current.length - 1;
                }else{
                    setSongIndex(songIndexRef.current - 1)
                    songIndexRef.current = songIndexRef.current - 1;
                }
            }
            setSongSwitch(songSwitchRef.current + 1)
            songSwitchRef.current = songSwitchRef.current + 1;
        }else if(isShuffleRef.current){
            setSongIndex(getRandomInt(tracksRef.current.length))
            songIndexRef.current = getRandomInt(tracksRef.current.length);
            setSongSwitch(songSwitchRef.current + 1)
            songSwitchRef.current = songSwitchRef.current + 1;
        }
    }

    function checkIsDownloaded(song){
        var songName = `${song.track.name + " - " + song.track.artists[0].name}`;
        songName = songName.replace(/[^A-Za-z0-9- ]/g, "");

        return downloadedSongs.includes(songName + ".mp3")
    }

    function songCallback(status){
        var pos = Math.floor(status.positionMillis / status.durationMillis * 100);
        var nextSongIndex = null;

        if(pos >= 93 && !transition){
            if(isPlayingRef.current){
                if(songIndex === null || songIndex >= tracks.length - 1){
                    nextSongIndex = 0
                }else{
                    nextSongIndex = songIndex + 1
                }
            }else if(isShuffleRef.current){
                if(shuffleRand.current == null){
                    shuffleRand.current = getRandomInt(tracks.length)
                }
                nextSongIndex = shuffleRand.current;
            }

            if(isPlayingRef.current || isShuffleRef.current){
                if(checkIsDownloaded(tracks[nextSongIndex])){
                    if(pos >= 99){
                        setSongIndex(nextSongIndex)
                        songIndexRef.current = nextSongIndex;
                        setSongSwitch(songSwitch + 1)
                        songSwitchRef.current = songSwitch + 1;
                        setTransition(true)
                    }
                }else{
                    setSongIndex(nextSongIndex)
                    songIndexRef.current = nextSongIndex;
                    setSongSwitch(songSwitch + 1)
                    songSwitchRef.current = songSwitch + 1;
                    setTransition(true)
                }
            }
        }

        if(pos >= 1){
            setScrollBarPos(pos)
            MusicControl.updatePlayback({
                state: MusicControl.STATE_PLAYING,
                elapsedTime: status.positionMillis / 1000,
            })
        }
    }

    const snapPoints = useMemo(() => ['10%', '25%'], []);

    const handleSheetChanges = useCallback((index) => {
        console.log('handleSheetChanges', index);
    }, []);

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
                                    isPlayingRef.current = false;
                                }else{
                                    setIsPlaying(true)
                                    isPlayingRef.current = true;
                                    setIsShuffle(false)
                                    isShuffleRef.current = false;
                                    if(songIndex === null || songIndex >= tracks.length - 1){
                                        setSongIndex(0)
                                        songIndexRef.current = 0;
                                    }else{
                                        setSongIndex(songIndex + 1)
                                        songIndexRef.current = songIndexRef + 1;
                                    }
                                    setSongSwitch(songSwitch + 1)
                                    songSwitchRef.current = songSwitch + 1
                                }
                            }}
                            disabled={isShuffle || tracks.length === 0}
                        >{isPlaying ? "Stop Play" : "Play"}</Button>
                        <Button
                            onPress={() => {
                                if (isShuffle){
                                    setIsShuffle(false)
                                    isShuffleRef.current = false;
                                }else{
                                    setIsPlaying(false)
                                    isPlayingRef.current = false;
                                    setIsShuffle(true)
                                    isShuffleRef.current = true;
                                    setSongIndex(getRandomInt(tracks.length))
                                    songIndexRef.current = getRandomInt(tracks.length);
                                    setSongSwitch(songSwitch + 1)
                                    songSwitchRef.current = songSwitch + 1;
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
                        ref={scrollViewRef}
                        style={{flex: 1, width: "100%"}}
                        onScroll={({nativeEvent}) => {
                            if (isCloseToBottom(nativeEvent)) {

                                if((renderSection + 1) + 20 < tracks.length){
                                    setRenderSection(renderSection + 1)
                                    scrollViewRef.current.scrollTo({y: nativeEvent.contentOffset.y - nativeEvent.contentSize.height / 20 * 5, animated: false})
                                }


                            }else if(isCloseToTop(nativeEvent)) {
                                if(renderSection > 0){
                                    setRenderSection(renderSection - 1)
                                    scrollViewRef.current.scrollTo({y: nativeEvent.contentSize.height / 20 * 5, animated: false})
                                }
                            }
                            //console.log(`Content offset y: ${nativeEvent.contentOffset.y} Layout measurement height: ${nativeEvent.layoutMeasurement.height} Content size height ${nativeEvent.contentSize.height}`);
                        }}
                    >
                        {tracks != null && trackDisplayed.map((song) => {
                            var color = ""
                            var fontColor = ""

                            var songName = `${song.track.name + " - " + song.track.artists[0].name}`;
                            songName = songName.replace(/[^A-Za-z0-9- ]/g, "");

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
                                        songIndexRef.current = tracks.indexOf(song);
                                        setSongSwitch(songSwitch + 1)
                                        songSwitchRef.current = songSwitch + 1;
                                    }}
                                />
                            )
                        })}
                    </ScrollView>
                    <BottomSheet
                        index={1}
                        snapPoints={snapPoints}
                        onChange={handleSheetChanges}
                    >
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
                    </BottomSheet>
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

/*
 */

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
