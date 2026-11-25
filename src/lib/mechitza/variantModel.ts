import { unzipSync, zipSync, type Zippable } from "fflate";

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BINARY_CHUNK = 0x004e4942;
const PRINTED_MATERIAL = "Linen Marquetry printed face";
const ARTWOOD_MATERIAL = "Navy Everwood relief";
const USDZ_FILM = "textures/linen_marquetry.jpg";
const USDZ_ART = "textures/artwork_color.jpg";
const USDZ_ALIGNMENT_FIELD = 0x1986;

interface TextureInfo {
  index: number;
}
interface GlbMaterial {
  name: string;
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: TextureInfo;
    metallicRoughnessTexture?: TextureInfo;
  };
  normalTexture?: TextureInfo;
  occlusionTexture?: TextureInfo;
  emissiveTexture?: TextureInfo;
}
interface GlbDocument {
  buffers: Array<{ byteLength: number }>;
  bufferViews: Array<{ buffer: number; byteOffset: number; byteLength: number }>;
  accessors: Array<{ bufferView?: number; sparse?: unknown }>;
  images: Array<{ bufferView: number }>;
  textures: Array<{ source: number; sampler?: number }>;
  samplers: unknown[];
  materials: GlbMaterial[];
  nodes: Array<{ mesh?: number; children?: number[]; skin?: number }>;
  meshes: Array<{
    primitives: Array<{ attributes: Record<string, number>; indices?: number; material?: number; targets?: unknown[] }>;
  }>;
  scenes: Array<{ nodes: number[] }>;
  scene?: number;
  skins?: unknown[];
  animations?: unknown[];
  cameras?: unknown[];
  extensionsUsed?: unknown[];
}

function decodeGlb(source: Buffer) {
  const jsonEnd = 20 + source.readUInt32LE(12);
  if (
    source.readUInt32LE(0) !== GLB_MAGIC ||
    source.readUInt32LE(4) !== 2 ||
    source.readUInt32LE(8) !== source.length ||
    source.readUInt32LE(16) !== GLB_JSON_CHUNK ||
    source.readUInt32LE(jsonEnd + 4) !== GLB_BINARY_CHUNK ||
    jsonEnd + 8 + source.readUInt32LE(jsonEnd) !== source.length
  ) {
    throw new Error("Invalid Mechitza GLB");
  }
  return {
    model: JSON.parse(source.toString("utf8", 20, jsonEnd)) as GlbDocument,
    binary: source.subarray(jsonEnd + 8),
  };
}

function encodeGlb(model: GlbDocument, ...buffers: Buffer[]): Buffer {
  const json = Buffer.from(JSON.stringify(model));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const binaryLength = Math.ceil(model.buffers[0].byteLength / 4) * 4;
  const totalLength = 28 + jsonLength + binaryLength;
  const result = Buffer.alloc(totalLength);
  result.writeUInt32LE(GLB_MAGIC, 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(totalLength, 8);
  result.writeUInt32LE(jsonLength, 12);
  result.writeUInt32LE(GLB_JSON_CHUNK, 16);
  json.copy(result, 20);
  result.fill(0x20, 20 + json.length, 20 + jsonLength);
  result.writeUInt32LE(binaryLength, 20 + jsonLength);
  result.writeUInt32LE(GLB_BINARY_CHUNK, 24 + jsonLength);

  let offset = 28 + jsonLength;
  for (const part of buffers) offset += part.copy(result, offset);
  return result;
}

function toLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function customizeGlb(source: Buffer, film: Buffer | null, artSwatch: string | null): Buffer {
  if (!film && !artSwatch) return source;
  const { model, binary } = decodeGlb(source);
  if (film) {
    const material = model.materials.find((item) => item.name === PRINTED_MATERIAL);
    const texture = material?.pbrMetallicRoughness?.baseColorTexture;
    const image = texture && model.images[model.textures[texture.index].source];
    if (!image) throw new Error("Printed film material is missing");
    // Append the image without moving any geometry or changing existing UVs.
    image.bufferView = model.bufferViews.push({
      buffer: 0,
      byteOffset: binary.length,
      byteLength: film.length,
    }) - 1;
    model.buffers[0].byteLength = binary.length + film.length;
  }
  if (artSwatch) {
    const material = model.materials.find((item) => item.name === ARTWOOD_MATERIAL);
    const pbr = material?.pbrMetallicRoughness;
    if (!pbr) throw new Error("Artwork material is missing");
    const rgb = [1, 3, 5].map((offset) => parseInt(artSwatch.slice(offset, offset + 2), 16));
    pbr.baseColorFactor = [...rgb.map(toLinear), pbr.baseColorFactor?.[3] ?? 1];
  }

  return film ? encodeGlb(model, binary, film) : encodeGlb(model, binary);
}

export function mergeFiguresGlb(panel: Buffer, people: Buffer): Buffer {
  const { model, binary } = decodeGlb(panel);
  const { model: figures, binary: figuresBinary } = decodeGlb(people);
  if (
    figures.buffers.length !== 1 ||
    figures.scenes.length !== 1 ||
    figures.skins?.length ||
    figures.animations?.length ||
    figures.cameras?.length ||
    figures.extensionsUsed?.length ||
    figures.accessors.some((accessor) => accessor.sparse) ||
    figures.meshes.some((mesh) => mesh.primitives.some((primitive) => primitive.targets?.length))
  ) {
    throw new Error("Mechitza height references must be a static GLB");
  }

  const offsets = {
    nodes: model.nodes.length,
    meshes: model.meshes.length,
    materials: model.materials.length,
    textures: model.textures.length,
    images: model.images.length,
    samplers: model.samplers.length,
    accessors: model.accessors.length,
    bufferViews: model.bufferViews.length,
  };

  for (const node of figures.nodes) {
    if (node.mesh !== undefined) node.mesh += offsets.meshes;
    if (node.children) node.children = node.children.map((index) => index + offsets.nodes);
  }
  for (const mesh of figures.meshes) {
    for (const primitive of mesh.primitives) {
      for (const attribute of Object.keys(primitive.attributes)) primitive.attributes[attribute] += offsets.accessors;
      if (primitive.indices !== undefined) primitive.indices += offsets.accessors;
      if (primitive.material !== undefined) primitive.material += offsets.materials;
    }
  }
  for (const material of figures.materials) {
    const pbr = material.pbrMetallicRoughness;
    const textureSlots = [pbr?.baseColorTexture, pbr?.metallicRoughnessTexture, material.normalTexture, material.occlusionTexture, material.emissiveTexture];
    for (const texture of textureSlots) if (texture) texture.index += offsets.textures;
  }
  for (const texture of figures.textures) {
    texture.source += offsets.images;
    if (texture.sampler !== undefined) texture.sampler += offsets.samplers;
  }

  for (const image of figures.images) image.bufferView += offsets.bufferViews;
  for (const accessor of figures.accessors) {
    if (accessor.bufferView !== undefined) accessor.bufferView += offsets.bufferViews;
  }
  for (const view of figures.bufferViews) view.byteOffset = binary.length + (view.byteOffset ?? 0);

  for (const key of Object.keys(offsets) as Array<keyof typeof offsets>) {
    // Both arrays contain the same corresponding glTF resource type.
    (model[key] as unknown[]).push(...figures[key]);
  }
  model.scenes[model.scene ?? 0].nodes.push(...figures.scenes[0].nodes.map((index) => index + offsets.nodes));
  model.buffers[0].byteLength = binary.length + figures.buffers[0].byteLength;
  return encodeGlb(model, binary, figuresBinary);
}

interface UsdzFigures {
  previewLayer: Buffer;
  figurePackage: Buffer;
}

export function customizeUsdz(source: Buffer, film: Buffer | null, art: Buffer | null, figures?: UsdzFigures): Buffer {
  if (!film && !art && !figures) return source;
  const contents = unzipSync(source);
  if (!contents[USDZ_FILM] || !contents[USDZ_ART]) throw new Error("USDZ texture is missing");

  if (film) contents[USDZ_FILM] = film;
  if (art) contents[USDZ_ART] = art;

  let members = Object.entries(contents);
  if (figures) {
    const [[panelName, panel], ...textures] = members;
    if (!panelName.endsWith(".usdc")) throw new Error("USDZ panel layer is missing");
    members = [
      ["preview.usdc", figures.previewLayer],
      ["panel.usdc", panel],
      ...textures,
      ...Object.entries(unzipSync(figures.figurePackage)).map(
        ([name, bytes]): [string, Uint8Array] => [`figures/${name}`, bytes],
      ),
    ];
  }

  const alignedFiles: Zippable = {};
  let offset = 0;
  for (const [name, bytes] of members) {
    // ZIP local headers are 30 bytes. Apple's USDZ format requires stored
    // entries with file data starting at a multiple of 64 bytes.
    const headerEnd = offset + 30 + Buffer.byteLength(name);
    const padding = (64 - headerEnd % 64) % 64;
    const extraLength = padding > 0 && padding < 4 ? padding + 64 : padding;
    alignedFiles[name] = extraLength
      ? [bytes, { extra: { [USDZ_ALIGNMENT_FIELD]: new Uint8Array(extraLength - 4) } }]
      : bytes;
    offset = headerEnd + extraLength + bytes.length;
  }
  return Buffer.from(zipSync(alignedFiles, { level: 0, mtime: new Date(2000, 0, 1) }));
}
