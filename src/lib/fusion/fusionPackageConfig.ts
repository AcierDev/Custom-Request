export const FUSION_PACKAGE_CONFIG = {
  filenamePrefix: "everwood-art-fusion",
  fileExtension: ".zip",
  mediaType: "application/zip",
  scriptDirectory: "EverwoodAppearance",
  scriptFilename: "EverwoodAppearance.py",
  scriptManifestFilename: "EverwoodAppearance.manifest",
  designManifestFilename: "design-manifest.json",
  readmeFilename: "README.txt",
  textureDirectory: "textures",
  scriptId: "99f83c8f-4b47-46b4-9632-a982b5ea2e9e",
  scriptAuthor: "Everwood",
  scriptDescription:
    "Apply Everwood Viewer wood appearances to an imported STEP model.",
  scriptVersion: "1.0.0",
  supportedOperatingSystems: "windows|mac",
  manifestSchemaVersion: 1,
  jsonIndentSpaces: 2,
  zipCompressionLevel: 6,
  firstComponentNumber: 1,
  componentNumberWidth: 3,
  defaultErrorMessage:
    "Unable to build the Fusion package. Please try again.",
} as const;
