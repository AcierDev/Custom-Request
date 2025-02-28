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
