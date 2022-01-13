import React, { useRef, useState } from 'react';

import { Platform } from 'react-native';

import { manipulateAsync } from 'expo-image-manipulator';

import Camera from '@hashiprobr/expo-camera';

import postpone from './postpone';

export default function useCamera(crop) {
    const cameraRef = useRef();
    const forbidRef = useRef(true);
    const repeatRef = useRef(Platform.OS === 'android');

    const [active, setActive] = useState(false);
    const [taking, setTaking] = useState(false);

    async function activate() {
        if (!active) {
            if (forbidRef.current) {
                const response = await Camera.requestCameraPermissionsAsync();
                if (response.granted) {
                    forbidRef.current = false;
                } else {
                    throw new Error('Could not receive permission');
                }
            }
            setActive(true);
        }
    }

    function deactivate() {
        if (active) {
            setActive(false);
        }
    }

    async function doTake() {
        const original = await cameraRef.current.takePictureAsync();
        if (crop) {
            const { uri, width, height } = original;
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
            const cropped = await manipulateAsync(uri, [{ crop: action }]);
            return cropped.uri;
        } else {
            return original.uri;
        }
    }

    async function take() {
        if (active && cameraRef.current) {
            let uri;
            setTaking(true);
            try {
                if (repeatRef.current) {
                    repeatRef.current = false;
                    cameraRef.current.takePictureAsync();
                }
                uri = await postpone(doTake, 1000);
            } finally {
                setTaking(false);
            }
            return uri;
        } else {
            return null;
        }
    }

    function Preview(props) {
        return (
            <Camera
                {...props}
                ref={cameraRef}
                crop={crop}
            />
        );
    }

    return [
        {
            active,
            taking,
            activate,
            deactivate,
            take,
        },
        Preview,
    ];
}
