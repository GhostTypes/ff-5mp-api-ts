export function formatScientificNotation(value: number): string {
    if (Math.abs(value) < 0.001 || Math.abs(value) >= 10000) {
        return value.toExponential();
    }
    return value.toString();
}