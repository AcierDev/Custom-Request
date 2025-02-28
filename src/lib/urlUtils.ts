import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

/**
 * Compresses a JSON string to make it more URL-friendly
 * @param jsonString The JSON string to compress
 * @returns A compressed string safe for use in URLs
 */
export const compressJsonForUrl = (jsonString: string): string => {
  return compressToEncodedURIComponent(jsonString);
};

/**
 * Decompresses a string that was compressed with compressJsonForUrl
 * @param compressedString The compressed string
 * @returns The original JSON string
 */
export const decompressJsonFromUrl = (compressedString: string): string => {
  try {
    const decompressed = decompressFromEncodedURIComponent(compressedString);
    if (!decompressed) {
      throw new Error("Decompression failed");
    }
    return decompressed;
  } catch (error) {
    console.error("Failed to decompress string:", error);
    throw error;
  }
};

/**
 * Generates a shareable URL with compressed state data
 * @param stateData The state data to include in the URL
 * @returns A shareable URL
 */
export const generateShareableUrl = (stateData: object): string => {
  const jsonString = JSON.stringify(stateData);
  const compressed = compressJsonForUrl(jsonString);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/order?share=${compressed}`;
};

/**
 * Extracts and parses state data from a compressed URL parameter
 * @param compressedData The compressed data from the URL
 * @returns The parsed state object
 */
export const extractStateFromUrl = <T>(compressedData: string): T => {
  try {
    const jsonString = decompressJsonFromUrl(compressedData);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Failed to extract state from URL:", error);
    throw error;
  }
};

/**
 * Generates a shorter shareable URL by using a more compact data structure
 * @param stateData The state data to include in the URL
 * @returns A shorter shareable URL
 */
export const generateShortShareableUrl = (stateData: any): string => {
  // Create a minimal representation of the state
  const minimalState: Record<string, any> = {};

  // Map property names to shorter keys
  const propertyMap: Record<string, string> = {
    dimensions: "d",
    selectedDesign: "sd",
    shippingSpeed: "ss",
    colorPattern: "cp",
    orientation: "o",
    isReversed: "ir",
    customPalette: "pal",
    isRotated: "rot",
    patternStyle: "ps",
    style: "st",
  };

  // Convert dimensions to a more compact format [width, height]
  if (stateData.dimensions) {
    minimalState.d = [stateData.dimensions.width, stateData.dimensions.height];
  }

  // For enums, use numeric indices instead of strings
  if (stateData.selectedDesign !== undefined) {
    minimalState.sd = stateData.selectedDesign;
  }

  // Shipping speed can be 0, 1, 2 instead of strings
  if (stateData.shippingSpeed) {
    const speedMap: Record<string, number> = {
      standard: 0,
      expedited: 1,
      rushed: 2,
    };
    minimalState.ss = speedMap[stateData.shippingSpeed];
  }

  // Color pattern can be numeric
  if (stateData.colorPattern) {
    const patternMap: Record<string, number> = {
      striped: 0,
      gradient: 1,
      checkerboard: 2,
      random: 3,
      fade: 4,
      "center-fade": 5,
    };
    minimalState.cp = patternMap[stateData.colorPattern];
  }

  // Orientation: 0 for horizontal, 1 for vertical
  if (stateData.orientation) {
    minimalState.o = stateData.orientation === "horizontal" ? 0 : 1;
  }

  // Boolean values
  if (stateData.isReversed !== undefined)
    minimalState.ir = stateData.isReversed ? 1 : 0;
  if (stateData.isRotated !== undefined)
    minimalState.rot = stateData.isRotated ? 1 : 0;

  // Pattern style: 0 for tiled, 1 for geometric
  if (stateData.patternStyle) {
    minimalState.ps = stateData.patternStyle === "tiled" ? 0 : 1;
  }

  // Style type
  if (stateData.style) {
    const styleMap: Record<string, number> = {
      geometric: 0,
      tiled: 1,
      striped: 2,
    };
    minimalState.st = styleMap[stateData.style];
  }

  // Optimize custom palette representation
  if (stateData.customPalette && stateData.customPalette.length > 0) {
    // Just store hex values without the # prefix to save space
    minimalState.pal = stateData.customPalette.map((color: any) => {
      const hex = color.hex.startsWith("#")
        ? color.hex.substring(1)
        : color.hex;
      return color.name ? [hex, color.name] : hex;
    });
  }

  const jsonString = JSON.stringify(minimalState);
  const compressed = compressJsonForUrl(jsonString);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/order?s=${compressed}`;
};

/**
 * Extracts and parses state data from a compressed short URL parameter
 * @param compressedData The compressed data from the URL
 * @returns The parsed state object with full property names
 */
export const extractStateFromShortUrl = <T>(compressedData: string): T => {
  try {
    const jsonString = decompressJsonFromUrl(compressedData);
    const minimalState = JSON.parse(jsonString);

    // Convert back to the full state object
    const fullState: Record<string, any> = {};

    // Convert dimensions back to object format
    if (minimalState.d) {
      fullState.dimensions = {
        width: minimalState.d[0],
        height: minimalState.d[1],
      };
    }

    // Convert design enum back
    if (minimalState.sd !== undefined) {
      fullState.selectedDesign = minimalState.sd;
    }

    // Convert shipping speed back to string
    if (minimalState.ss !== undefined) {
      const speedMap = ["standard", "expedited", "rushed"];
      fullState.shippingSpeed = speedMap[minimalState.ss];
    }

    // Convert color pattern back to string
    if (minimalState.cp !== undefined) {
      const patternMap = [
        "striped",
        "gradient",
        "checkerboard",
        "random",
        "fade",
        "center-fade",
      ];
      fullState.colorPattern = patternMap[minimalState.cp];
    }

    // Convert orientation back to string
    if (minimalState.o !== undefined) {
      fullState.orientation = minimalState.o === 0 ? "horizontal" : "vertical";
    }

    // Convert boolean values
    if (minimalState.ir !== undefined)
      fullState.isReversed = minimalState.ir === 1;
    if (minimalState.rot !== undefined)
      fullState.isRotated = minimalState.rot === 1;

    // Convert pattern style back to string
    if (minimalState.ps !== undefined) {
      fullState.patternStyle = minimalState.ps === 0 ? "tiled" : "geometric";
    }

    // Convert style type back to string
    if (minimalState.st !== undefined) {
      const styleMap = ["geometric", "tiled", "striped"];
      fullState.style = styleMap[minimalState.st];
    }

    // Convert palette back to full format
    if (minimalState.pal) {
      fullState.customPalette = minimalState.pal.map((color: any) => {
        if (typeof color === "string") {
          return { hex: color.startsWith("#") ? color : `#${color}` };
        } else {
          // It's an array with [hex, name]
          return {
            hex: color[0].startsWith("#") ? color[0] : `#${color[0]}`,
            name: color[1],
          };
        }
      });
    }

    return fullState as T;
  } catch (error) {
    console.error("Failed to extract state from short URL:", error);
    throw error;
  }
};
