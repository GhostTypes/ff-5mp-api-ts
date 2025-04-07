// src/api/network/NetworkUtils.ts
import { GenericResponse } from '../controls/Control';
import { FNetCode } from './FNetCode';

export class NetworkUtils {
    public static isOk(response: GenericResponse): boolean {
        return response.code === FNetCode.Ok && response.message === 'Success';
    }
}