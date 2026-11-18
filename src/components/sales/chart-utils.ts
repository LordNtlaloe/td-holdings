const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export function niceCeil(value: number): number {
    if (!(value > 0)) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const fraction = value / magnitude;
    const step = NICE_STEPS.find((s) => s >= fraction - 1e-9) ?? 10;
    return step * magnitude;
}