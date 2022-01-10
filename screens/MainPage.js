import {StyleSheet, Text, View, ScrollView, SafeAreaView} from 'react-native';
import {useContext, useEffect, useState} from "react";
import axios from "axios";
import {Card, Paragraph, Title, Button} from "react-native-paper";

import {ApiTokenContext} from "../contexts/ApiTokenContext";

export default function MainPage({navigation}) {
    let [token, setToken] = useContext(ApiTokenContext)
    let [playlist, setPlaylist] = useState(null)

    function renderCards(playlistObj){
        var imageUrl = ""

        if(playlistObj.images.length === 0){
            imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/1665px-No-Image-Placeholder.svg.png"
        }else{
            imageUrl = playlistObj.images[0].url
        }

        return (
            <Card style={{width: "100%"}} mode={"outlined"} key={playlistObj.id}>
                <Card.Content>
                    <Title>{playlistObj.name}</Title>
                    <Paragraph>By {playlistObj.owner.display_name}</Paragraph>
                </Card.Content>
                <Card.Cover source={{uri: imageUrl}}/>
                <Card.Actions>
                    <Button onPress={() => {
                        navigation.navigate('PlaylistView', {playlistID: playlistObj.id})
                    }}>Listen</Button>
                </Card.Actions>
            </Card>
        )
    }

    useEffect(() => {
        axios.get("https://api.spotify.com/v1/me/playlists?limit=50", {headers: {'Authorization': "Bearer " + token}}).then((resp) => {
            setPlaylist(resp.data.items)
        }).catch((err) => {
            alert(err);
        })
    }, [token])

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                {playlist != null && playlist.map(renderCards)}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
    }
});
