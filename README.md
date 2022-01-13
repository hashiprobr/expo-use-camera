expo-use-camera
===============

**A React Hook for simplifying basic usage of
[expo-camera](https://docs.expo.dev/versions/v44.0.0/sdk/camera/)**

This hook receives a boolean `crop` and returns an object and an component.

The object has five properties:

* a reference `ref`;

* a boolean state `active`;

* an asynchronous method `activate`, that asks for permission to access the
  camera, sets the aforementioned state to `true` if it is granted, and throws
  an error otherwise;

* a synchronous method `deactivate`, that sets the aforementioned state to
  `false`.

* an asynchronous method `take` that takes a picture and returns it.

If `crop` is true, the picture is cropped to a square area.

The component is a [modified
version](https://www.npmjs.com/package/@hashiprobr/expo-camera) of
[expo-camera](https://docs.expo.dev/versions/v44.0.0/sdk/camera/), but without
two props: `ref`, because it is already available in the object, and `crop`,
because it is already defined by the hook argument.


Peer dependencies
-----------------

``` json
{
    "@hashiprobr/expo-camera": "^1.0.8",
    "@hashiprobr/react-use-mount-and-update": "^1.0.4",
    "expo": "^43.0.5",
    "expo-image-manipulator": "^10.1.2",
    "hoist-non-react-statics": "^3.3.2",
    "react": "^17.0.1",
    "react-native": ">=0.64.3"
}
```


Install
-------

With npm:

```
npm install @hashiprobr/expo-use-camera
```

With yarn:

```
yarn add @hashiprobr/expo-use-camera
```

With expo:

```
expo install @hashiprobr/expo-use-camera
```

If using Expo, add the module to `webpack.config.js`:

``` js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync({
        ...env,
        babel: {
            dangerouslyAddModulePathsToTranspile: [
                '@hashiprobr/expo-use-camera',
            ],
        },
    }, argv);
    return config;
};
```

If `webpack.config.js` does not exist, create it with:

```
expo customize:web
```


Example
-------

``` js
import React, { useState } from 'react';

import { View, Image, Button } from 'react-native';

import useCamera from '@hashiprobr/expo-use-camera';

export default function MyComponent() {
    const [uri, setUri] = useState(null);

    const [camera, Preview] = useCamera(true);

    async function onPressOpen() {
        try {
            await camera.activate();
        } catch (error) {
            console.error(error);
        }
    }

    async function onPressTake() {
        let source;
        try {
            source = await camera.take();
        } catch (error) {
            console.error(error);
        }
        if (source) {
            camera.deactivate();
            setUri(source.uri);
        }
    }

    function onPressClose() {
        camera.deactivate();
    }

    return (
        <View
            style={{
                flexGrow: 1,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {camera.active ? (
                <Preview
                    style={{
                        flexGrow: 1,
                        alignSelf: 'stretch',
                        justifyContent: 'flex-end',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-around',
                        }}
                    >
                        <Button title="take" onPress={onPressTake} />
                        <Button title="close" onPress={onPressClose} />
                    </View>
                </Preview>
            ) : (
                <>
                    {uri && (
                        <Image style={{ width: 250, height: 250 }} source={{ uri }} />
                    )}
                    <Button title="open" onPress={onPressOpen} />
                </>
            )}
        </View>
    );
}
```
