import { AppRegistry, Platform } from "react-native"
import RNBootSplash from "react-native-bootsplash"

import { StorybookUIRoot } from "./StorybookUI"

if (Platform.OS === "android") {
  RNBootSplash.hide()
}

AppRegistry.registerComponent("Artsy", () => StorybookUIRoot)
