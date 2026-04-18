import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent sets up the correct entry for both Expo Go and a
// native/bare build, replacing the older `expo/AppEntry` path that SDK 52
// dropped.
registerRootComponent(App);
