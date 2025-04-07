// src/api/filament/Filament.ts
export class Filament {
    public readonly loadTemp: number;
    public readonly name: string;

    constructor(name: string, loadTemp: number = 220) {
        this.name = name;
        this.loadTemp = loadTemp;
    }
}