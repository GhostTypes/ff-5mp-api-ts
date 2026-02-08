/**
 * @fileoverview Number formatting utility for scientific notation
 *
 * Formats numbers using scientific notation when values are very small (< 0.001)
 * or very large (>= 10000), otherwise returns standard decimal representation.
 */

/**
 * Formats a number into a string, using scientific notation if the number is
 * very small (absolute value < 0.001) or very large (absolute value >= 10000).
 * Otherwise, it returns the standard string representation of the number.
 *
 * @param value The number to format.
 * @returns A string representation of the number, potentially in scientific notation.
 *
 * @example
 * formatScientificNotation(0.000123) // "1.23e-4"
 * formatScientificNotation(12345)    // "1.2345e+4"
 * formatScientificNotation(12.34)     // "12.34"
 */
export function formatScientificNotation(value: number): string {
    if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
        return value.toExponential();
    }
    return value.toString();
}