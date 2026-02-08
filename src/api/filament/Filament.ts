/**
 * @fileoverview Filament type model for 3D printing operations
 *
 * Represents filament materials with name and recommended loading temperature
 * for use in printer operations like loading filament or preheating.
 */
// src/api/filament/Filament.ts
/**
 * Represents a type of filament used in a 3D printer.
 * It stores information about the filament's name and its recommended loading temperature.
 * This class can be used to define specific filament types for printer operations
 * like loading or preheating.
 */
export class Filament {
    /** The recommended loading temperature for this filament in Celsius. */
    public readonly loadTemp: number;
    /** The name of the filament type (e.g., "PLA", "ABS", "PETG"). */
    public readonly name: string;

    /**
     * Creates an instance of the Filament class.
     * @param name The name of the filament type.
     * @param loadTemp The recommended loading temperature for the filament in Celsius. Defaults to 220°C.
     */
    constructor(name: string, loadTemp: number = 220) {
        this.name = name;
        this.loadTemp = loadTemp;
    }
}