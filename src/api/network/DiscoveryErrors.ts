/**
 * @fileoverview Typed error classes for FlashForge printer discovery.
 *
 * Provides a hierarchy of error types for discovery failures following
 * the FNetCode pattern used elsewhere in the codebase.
 */

/**
 * Base error class for all discovery-related errors.
 * Extends Error with an additional code property for error categorization.
 */
export class DiscoveryError extends Error {
    /** Error code for identifying the type of discovery failure */
    public readonly code: string;

    /**
     * Creates a new DiscoveryError.
     * @param message Human-readable error description
     * @param code Machine-readable error code identifier
     */
    constructor(message: string, code: string) {
        super(message);
        this.name = 'DiscoveryError';
        this.code = code;
    }
}

/**
 * Error thrown when a printer response has an invalid size.
 * Indicates the received UDP response doesn't match expected protocol formats.
 */
export class InvalidResponseError extends DiscoveryError {
    /** Size of the invalid response in bytes */
    public readonly responseSize: number;
    /** IP address that sent the invalid response */
    public readonly address: string;

    /**
     * Creates a new InvalidResponseError.
     * @param size Size of the invalid response in bytes
     * @param address IP address that sent the invalid response
     */
    constructor(size: number, address: string) {
        super(`Invalid response size: ${size} bytes from ${address}`, 'INVALID_RESPONSE');
        this.name = 'InvalidResponseError';
        this.responseSize = size;
        this.address = address;
    }
}

/**
 * Error thrown when UDP socket creation fails.
 * Indicates a system-level networking issue preventing discovery.
 */
export class SocketCreationError extends DiscoveryError {
    /**
     * Creates a new SocketCreationError.
     * @param message Description of the socket creation failure
     */
    constructor(message: string) {
        super(message, 'SOCKET_CREATION_FAILED');
        this.name = 'SocketCreationError';
    }
}

/**
 * Error thrown when discovery timeout expires.
 * Indicates no printers were found within the specified time window.
 */
export class DiscoveryTimeoutError extends DiscoveryError {
    /** Timeout duration in milliseconds */
    public readonly timeoutMs: number;

    /**
     * Creates a new DiscoveryTimeoutError.
     * @param timeoutMs Timeout duration in milliseconds
     */
    constructor(timeoutMs: number) {
        super(`Discovery timeout after ${timeoutMs}ms`, 'DISCOVERY_TIMEOUT');
        this.name = 'DiscoveryTimeoutError';
        this.timeoutMs = timeoutMs;
    }
}
