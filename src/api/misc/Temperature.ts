// src/api/misc/Temperature.ts
export class Temperature {
    private readonly _value: number;

    constructor(value: number) {
        this._value = value;
    }

    public getValue(): number {
        return this._value;
    }

    public toString(): string {
        return this._value.toString();
    }
}