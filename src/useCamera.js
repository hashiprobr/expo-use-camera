import React, { useRef, useState } from 'react';

import { Platform, View, useWindowDimensions } from 'react-native';

import * as FileSystem from 'expo-file-system';
import { manipulateAsync } from 'expo-image-manipulator';
import { Camera } from 'expo-camera';

const MAX_SIZE = 512;

export default function useCamera(uri, square) {
    const ref = useRef();

    const [allowed, setAllowed] = useState(false);
    const [active, setActive] = useState(false);
    const [first, setFirst] = useState(Platform.OS === 'android');
    const [photo, setPhoto] = useState({
        taking: false,
        saving: false,
        valid: true,
        uri: uri,
        error: null,
    });

    const [androidPadding, setAndroidPadding] = useState(0);

    const { width: windowWidth, height: windowHeight } = useWindowDimensions();

    function activate() {
        if (!active) {
            if (allowed) {
                setActive(true);
            } else {
                Camera.requestCameraPermissionsAsync()
                    .then((response) => {
                        if (response.granted) {
                            setAllowed(true);
                            setActive(true);
                        }
                    })
                    .catch((error) => {
                        setPhoto({
                            taking: false,
                            saving: false,
                            valid: false,
                            uri: photo.uri,
                            error: error,
                        });
                    });
            }
        }
    }

    function encode(inputUri, onSuccess) {
        if (Platform.OS === 'web') {
            setPhoto({
                taking: false,
                saving: false,
                valid: true,
                uri: inputUri,
                error: photo.error,
            });
            if (onSuccess) {
                onSuccess(inputUri);
            } else {
                setActive(false);
            }
        } else {
            FileSystem.readAsStringAsync(inputUri, { encoding: FileSystem.EncodingType.Base64 })
                .then((data) => {
                    const outputUri = `data:image/jpg;base64,${data}`;
                    setPhoto({
                        taking: false,
                        saving: false,
                        valid: true,
                        uri: outputUri,
                        error: photo.error,
                    });
                    if (onSuccess) {
                        onSuccess(outputUri);
                    } else {
                        setActive(false);
                    }
                });
        }
    }

    function resize(result, onSuccess) {
        let width;
        let height;
        if (result.width < result.height) {
            height = MAX_SIZE;
            width = result.width * (height / result.height);
        } else {
            width = MAX_SIZE;
            height = result.height * (width / result.width);
        }
        manipulateAsync(result.uri, [{ resize: { width, height } }])
            .then((resized) => {
                encode(resized.uri, onSuccess);
            });
    }

    function encodeOrResize(result, onSuccess) {
        if (result.width <= MAX_SIZE && result.height <= MAX_SIZE) {
            encode(result.uri, onSuccess);
        } else {
            resize(result, onSuccess);
        }
    }

    function doTake(onSuccess, onFailure) {
        ref.current.takePictureAsync()
            .then((result) => {
                setPhoto({
                    taking: false,
                    saving: true,
                    valid: photo.valid,
                    uri: photo.uri,
                    error: photo.error,
                });
                if (square) {
                    const crop = {};
                    if (result.width < result.height) {
                        crop.originX = 0;
                        crop.originY = (result.height - result.width) / 2;
                        crop.width = result.width;
                        crop.height = result.width;
                    } else {
                        crop.originX = (result.width - result.height) / 2;
                        crop.originY = 0;
                        crop.width = result.height;
                        crop.height = result.height;
                    }
                    manipulateAsync(result.uri, [{ crop: crop }])
                        .then((cropped) => {
                            encodeOrResize(cropped, onSuccess);
                        });
                } else {
                    encodeOrResize(result, onSuccess);
                }
            })
            .catch((error) => {
                setPhoto({
                    taking: false,
                    saving: false,
                    valid: false,
                    uri: photo.uri,
                    error: error,
                });
                if (onFailure) {
                    onFailure(error);
                } else {
                    setActive(false);
                }
            });
    }

    function take(onSuccess, onFailure) {
        if (active && ref.current) {
            setPhoto({
                taking: true,
                saving: photo.saving,
                valid: photo.valid,
                uri: photo.uri,
                error: photo.error,
            });
            if (first) {
                setFirst(false);
                ref.current.takePictureAsync();
            }
            setTimeout(() => doTake(onSuccess, onFailure), 1000);
        }
    }

    function deactivate() {
        if (active) {
            setActive(false);
        }
    }

    function pause() {
        if (ref.current) {
            ref.current.pausePreview();
        }
    }

    function resume() {
        if (ref.current) {
            ref.current.resumePreview();
        }
    }

    function onCameraReady() {
        if (ref.current) {
            ref.current.getSupportedRatiosAsync()
                .then((ratioStrings) => {
                    let windowRatio;
                    if (windowWidth < windowHeight) {
                        windowRatio = windowHeight / windowWidth;
                    } else {
                        windowRatio = windowWidth / windowHeight;
                    }
                    let minimum = Number.POSITIVE_INFINITY;
                    let bestRatio;
                    for (const ratioString of ratioStrings) {
                        const dimensions = ratioString.split(':');
                        const ratio = parseInt(dimensions[0]) / parseInt(dimensions[1]);
                        const distance = windowRatio - ratio;
                        if (distance >= 0 && distance < minimum) {
                            minimum = distance;
                            bestRatio = ratio;
                        }
                    }
                    if (windowWidth < windowHeight) {
                        setAndroidPadding((windowHeight - windowWidth * bestRatio) / 2);
                    } else {
                        setAndroidPadding((windowWidth - windowHeight * bestRatio) / 2);
                    }
                })
                .catch((error) => {
                    setPhoto({
                        taking: false,
                        saving: false,
                        valid: false,
                        uri: photo.uri,
                        error: error,
                    });
                    setActive(false);
                });
        }
    }

    function Preview(props) {
        const style = { ...props.style };
        const cameraProps = {};
        for (const [name, value] of Object.entries(props)) {
            if (name !== 'style' && name !== 'children') {
                cameraProps[name] = value;
            }
        }
        let squarePadding;
        if (windowWidth < windowHeight) {
            squarePadding = (windowHeight - windowWidth) / 2;
        } else {
            squarePadding = (windowWidth - windowHeight) / 2;
        }
        return (
            <View
                style={{
                    ...style,
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                    padding: 0,
                    paddingTop: 0,
                    paddingRight: 0,
                    paddingBottom: 0,
                    paddingLeft: 0,
                    overflow: 'visible',
                }}
            >
                {Platform.OS === 'android' ? (
                    <View
                        style={{
                            flexGrow: 1,
                            flexDirection: windowWidth < windowHeight ? 'column' : 'row',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            zIndex: 1,
                        }}
                    >
                        <View
                            style={{
                                height: androidPadding,
                                backgroundColor: '#000000',
                            }}
                        />
                        <Camera
                            {...cameraProps}
                            ref={ref}
                            style={{
                                flexGrow: 1,
                            }}
                            onCameraReady={() => {
                                onCameraReady();
                                if (cameraProps.onCameraReady) {
                                    cameraProps.onCameraReady();
                                }
                            }}
                        />
                        <View
                            style={{
                                height: androidPadding,
                                backgroundColor: '#000000',
                            }}
                        />
                    </View>
                ) : (
                    <Camera
                        {...cameraProps}
                        ref={ref}
                        style={{
                            flexGrow: 1,
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            zIndex: 1,
                        }}
                    />
                )}
                {square && (
                    <View
                        style={{
                            flexGrow: 1,
                            flexDirection: windowWidth < windowHeight ? 'column' : 'row',
                            justifyContent: 'space-between',
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            zIndex: 2,
                            opacity: 0.5,
                        }}
                    >
                        <View
                            style={{
                                height: squarePadding,
                                backgroundColor: '#000000',
                            }}
                        />
                        <View
                            style={{
                                height: squarePadding,
                                backgroundColor: '#000000',
                            }}
                        />
                    </View>
                )}
                <View
                    style={{
                        flexGrow: 1,
                        flexDirection: style.flexDirection,
                        flexWrap: style.flexWrap,
                        justifyContent: style.justifyContent,
                        alignItems: style.alignItems,
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 3,
                        padding: style.padding,
                        paddingTop: style.paddingTop,
                        paddingRight: style.paddingRight,
                        paddingBottom: style.paddingBottom,
                        paddingLeft: style.paddingLeft,
                        overflow: style.overflow,
                    }}
                >
                    {props.children}
                </View>
            </View>
        );
    }

    return {
        camera: {
            allowed,
            active,
            activate,
            take,
            deactivate,
            pause,
            resume,
        },
        photo,
        Preview,
    };
}
