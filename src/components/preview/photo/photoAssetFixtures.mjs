import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { preparePhotoModel } from "./photoModelLoader.ts";

const GLB = { jsonLengthOffset: 12, jsonStart: 20, chunkHeader: 8, header: 12, alignment: 4,
  magic: 0x46546c67, jsonType: 0x4e4f534a, binaryType: 0x004e4942, version: 2, space: 0x20 };

/** Parse the real bundled transforms/geometry in Node. Only image decoding
 * is omitted; these fixtures exercise authored bounds rather than boxes. */
export async function photoGeometryFixture(url) {
  const bytes = await readFile(new URL(`../../../../public${url}`, import.meta.url));
  const length = bytes.readUInt32LE(GLB.jsonLengthOffset);
  const doc = JSON.parse(bytes.subarray(GLB.jsonStart, GLB.jsonStart + length).toString());
  doc.materials = doc.materials.map(() => ({ pbrMetallicRoughness: { roughnessFactor: 1 } }));
  doc.images = []; doc.textures = [];
  const metadata = Buffer.from(JSON.stringify(doc));
  const jsonLength = Math.ceil(metadata.length / GLB.alignment) * GLB.alignment;
  const binary = bytes.subarray(GLB.jsonStart + length + GLB.chunkHeader);
  const total = GLB.header + GLB.chunkHeader * GLB.version + jsonLength + binary.length;
  const packed = Buffer.alloc(total);
  packed.writeUInt32LE(GLB.magic, 0); packed.writeUInt32LE(GLB.version, GLB.alignment);
  packed.writeUInt32LE(total, GLB.chunkHeader); packed.writeUInt32LE(jsonLength, GLB.header);
  packed.writeUInt32LE(GLB.jsonType, GLB.header + GLB.alignment);
  packed.fill(GLB.space, GLB.jsonStart, GLB.jsonStart + jsonLength); metadata.copy(packed, GLB.jsonStart);
  packed.writeUInt32LE(binary.length, GLB.jsonStart + jsonLength);
  packed.writeUInt32LE(GLB.binaryType, GLB.jsonStart + jsonLength + GLB.alignment);
  binary.copy(packed, GLB.jsonStart + jsonLength + GLB.chunkHeader);
  const gltf = await new GLTFLoader().parseAsync(packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.byteLength), "");
  return preparePhotoModel(gltf.scene);
}
