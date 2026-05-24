declare module "spectral.js" {
  export class Color {
    constructor(value: string | number[]);
    tintingStrength?: number;
    toString(options?: {
      format?: "hex" | "rgb";
      method?: "map" | "clip";
    }): string;
  }

  export function mix(...colors: Array<[Color, number]>): Color;
  export function palette(colorA: Color, colorB: Color, size: number): Color[];
  export function gradient(position: number, ...stops: Array<[Color, number]>): Color;
}
