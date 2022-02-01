import {WebView} from "react-native-webview";
import {View} from "react-native-web";

export default function MusicPlayer({route, navigation}){
    const {url} = route.params
    const runFirst = `
      document.getElementsByName('media')[0].addEventListener('ended',function() { window.ReactNativeWebView.postMessage("Hello!"); },false);
      true; // note: this is required, or you'll sometimes get silent failures
    `;
    return (
        <WebView
            source={{
                uri: url,
            }}
            onMessage={(event) => {navigation.goBack()}}
            injectedJavaScript={runFirst}
        />
    )
}
