// src/api/misc/Temperature.ts
/**
 * Represents a temperature value.
 * This class is a simple wrapper around a numeric temperature value,
 * providing methods to get the value and its string representation.
 * It's not explicitly for current/target temperatures as per the task description,
 * but rather a general temperature representation.
 * For current and target temperature pairs, a different structure like an interface
 * (e.g., `{ current: number, set: number }`) is used elsewhere in the models.
 */
export class Temperature {
    /** The underlying temperature value, typically in Celsius. */
    private readonly _value: number;

    /**
     * Creates an instance of the Temperature class.
     * @param value The numeric temperature value.
     */
    constructor(value: number) {
        this._value = value;
    }

    /**
     * Gets the numeric temperature value.
     * @returns The temperature value.
     */
    public getValue(): number {
        return this._value;
    }

    /**
     * Gets the string representation of the temperature value.
     * @returns The temperature value as a string.
     */
    public toString(): string {
        return this._value.toString();
    }
}