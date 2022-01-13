import React, { useRef, useState } from 'react';

import hoistNonReactStatics from 'hoist-non-react-statics';

import { manipulateAsync } from 'expo-image-manipulator';

import Camera from '@hashiprobr/expo-camera';
import { useMount } from '@hashiprobr/react-use-mount-and-update';

export default function useCamera(crop) {
    const cameraRef = useRef();
    const blockedRef = useRef(true);
    const readyRef = useRef(false);
    const idleRef = useRef(true);

    const [active, setActive] = useState(false);

    async function activate() {
        if (!active) {
            if (blockedRef.current) {
                const response = await Camera.requestCameraPermissionsAsync();
                if (response.granted) {
                    blockedRef.current = false;
                } else {
                    throw new Error('Could not receive permission');
                }
            }
            setActive(true);
        }
    }

    function deactivate() {
        if (idleRef.current && active) {
            setActive(false);
        }
    }

    async function take() {
        if (cameraRef.current && readyRef.current && idleRef.current && active) {
            let source;
            idleRef.current = false;
            source = await cameraRef.current.takePictureAsync();
            if (crop) {
                const { uri, width, height } = source;
                const action = {};
                if (width < height) {
                    action.originX = 0;
                    action.originY = (height - width) / 2;
                    action.width = width;
                    action.height = width;
                } else {
                    action.originX = (width - height) / 2;
                    action.originY = 0;
                    action.width = height;
                    action.height = height;
                }
                source = await manipulateAsync(uri, [{ crop: action }]);
            }
            idleRef.current = true;
            return source;
        }
    }

    function Preview(props) {
        function onCameraReady() {
            readyRef.current = true;
            if (props.onCameraReady) {
                props.onCameraReady();
            }
        }
        useMount(() => {
            return () => readyRef.current = false;
        });
        return (
            <Camera
                {...props}
                ref={cameraRef}
                crop={crop}
                onCameraReady={onCameraReady}
            />
        );
    }

    hoistNonReactStatics(Preview, Camera);

    return [
        {
            ref: cameraRef,
            active,
            activate,
            deactivate,
            take,
        },
        Preview,
    ];
}
