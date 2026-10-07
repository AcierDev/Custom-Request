import assert from 'node:assert/strict';
import test from 'node:test';
import { PHOTO_ART_CONFIG as A, PHOTO_MATH as M, PHOTO_TEXTURE_CONFIG as T } from './photoConfig.ts';
import { photoGrainReliefPixels } from './photoGrain.ts';
import { blendPhotoGrainByte } from './photoTextures.ts';
import { WEDGE_GEOMETRY_CONFIG as W } from '../../../lib/wedgeGeometry.ts';
const CHECK = { size: 256, cycles: 16, midpoint: 0.5, amplitude: 0.4, tileMeters: 0.0762,
  maximumRmsSlope: 0.12, minimumRmsSlope: 0.01, minimumCoatedAlbedoByte: 245 };

for (const squareScale of [M.one, W.miniScale]) test('painted grain remains shallow enough for broad semi-gloss highlights instead of corrugation', () => {
 const field = Float32Array.from({length: CHECK.size * CHECK.size}, (_,index) => CHECK.midpoint + CHECK.amplitude * Math.sin((index % CHECK.size) / CHECK.size * CHECK.cycles * M.fullTurn));
 const {normal} = photoGrainReliefPixels(field, CHECK.size, CHECK.size, {grid:M.one,tileMeters:[CHECK.tileMeters*squareScale,CHECK.tileMeters*squareScale],heightMeters:A.grainReliefMeters,smoothingMeters:A.grainSmoothingMeters,flipY:false});
 let squaredSlope=M.zero;
 for(let pixel=M.zero;pixel<field.length;pixel+=M.one) {
  const offset=pixel*T.channels;
  const x=normal[offset]/T.byteMax*M.two-M.one, z=normal[offset+M.two]/T.byteMax*M.two-M.one;
  squaredSlope+=(x/z)**M.two;
 }
 const rms=Math.sqrt(squaredSlope/field.length);
 assert.ok(rms<CHECK.maximumRmsSlope, `grain reflections are too steep: ${rms}`);
 assert.ok(rms>CHECK.minimumRmsSlope, 'wood relief must stay visible rather than become smooth plastic');
});

test('opaque paint does not turn the photographed grain into dark printed stripes', () => {
 assert.ok(blendPhotoGrainByte(M.zero)>=CHECK.minimumCoatedAlbedoByte);
 assert.equal(blendPhotoGrainByte(T.byteMax),T.byteMax);
});
