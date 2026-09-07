import Constants, { ExecutionEnvironment } from 'expo-constants';

export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const LAN_IP = '192.168.0.114';
const EMULATOR_HOST = '10.0.2.2';

export const HOST = IS_EXPO_GO ? LAN_IP : EMULATOR_HOST;
export const WS_BASE_URL = `ws://${HOST}:8000`;
export const HTTP_BASE_URL = `http://${HOST}:8000`;
export const FRAME_INTERVAL_MS = 250;
export const AUDIO_CHUNK_MS = 1300;
export const AUDIO_SAMPLE_RATE = 16000;