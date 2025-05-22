// src/api/network/NetworkUtils.ts
import { GenericResponse } from '../controls/Control';
import { FNetCode } from './FNetCode';

/**
 * Provides utility functions for network-related operations,
 * particularly for interpreting API responses from the printer.
 */
export class NetworkUtils {
    /**
     * Checks if a generic API response indicates success.
     * A response is considered "OK" if its code is `FNetCode.Ok` (0)
     * and its message is "Success".
     *
     * @param response The `GenericResponse` object received from the API.
     * @returns True if the response signifies success, false otherwise.
     */
    public static isOk(response: GenericResponse): boolean {
        return response.code === FNetCode.Ok && response.message === 'Success';
    }
}