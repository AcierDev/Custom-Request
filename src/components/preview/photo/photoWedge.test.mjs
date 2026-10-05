import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createPhotoArtwork } from "./photoArtwork.ts";
import { getNormalizedWedgeCorners } from "../../../lib/wedgeGeometry.ts";
import { PHOTO_ART_CONFIG as C, PHOTO_MATH as M } from "./photoConfig.ts";

const F = { scale: 0.5, grainIndex: 5, tolerance: 1e-6, edgeDecimals: 6, bevelNormalThreshold: 0.01 };
const snapshot = { instances: [{ x:M.zero,y:M.zero,color:"#567778",hidden:false,px:M.zero,py:M.zero,pz:M.zero,
  baseX:M.zero,driftDir:M.zero,rotationZ:M.zero,scaleXY:F.scale,scaleZ:F.scale,physicalScale:F.scale,grainIndex:F.grainIndex }],
  backboardBodies:[],orientationRotationZ:M.zero,showWoodGrain:false,squareGapInches:M.zero,
  panelCount:M.one,panelSpacingInches:M.zero,totalWidth:F.scale,totalHeight:F.scale,squareSize:F.scale,useMini:false,updatedAt:M.one };
const textures = { metallic:false,grainMap:null,grainNormal:null,sideMap:null,sideNormal:null,plywoodMap:null };
const cleanup = art => art.group.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });

test("photographic wedges have closed edge chamfers while retaining their measured footprint", () => {
  const art = createPhotoArtwork(snapshot, textures);
  try {
    const tile = art.group.children[M.zero];
    const corners = getNormalizedWedgeCorners();
    const sourceBounds = new THREE.Box3().setFromPoints(corners.map(point => new THREE.Vector3(point.x,point.y,point.z)));
    const edges = new Map();
    let hasChamfer = false;
    const key = point => point.toArray().map(value => value.toFixed(F.edgeDecimals)).join(',');
    for (const mesh of tile.children) {
      const geometry = mesh.geometry, position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
      for(let vertex=M.zero;vertex<position.count;vertex+=M.one){
        const point = new THREE.Vector3().fromBufferAttribute(position,vertex);
        assert.ok(sourceBounds.clone().expandByScalar(F.tolerance).containsPoint(point));
        const n = new THREE.Vector3().fromBufferAttribute(normal,vertex);
        assert.ok(Number.isFinite(n.length()));
        if(Math.abs(n.x)>F.bevelNormalThreshold && Math.abs(n.z)>F.bevelNormalThreshold) hasChamfer = true;
      }
      const index=geometry.getIndex();
      const count=index?.count ?? position.count;
      for(let start=M.zero;start<count;start+=M.three){
        const triangle=Array.from({length:M.three},(_,offset)=>new THREE.Vector3().fromBufferAttribute(position,index ? index.getX(start+offset) : start+offset));
        const centroid=triangle.reduce((sum,point)=>sum.add(point),new THREE.Vector3()).multiplyScalar(M.one/M.three);
        const faceNormal=new THREE.Vector3().subVectors(triangle[M.one],triangle[M.zero]).cross(new THREE.Vector3().subVectors(triangle[M.two],triangle[M.zero])).normalize();
        assert.ok(faceNormal.dot(centroid.clone().sub(sourceBounds.getCenter(new THREE.Vector3())))>M.zero,"a surface points into the wood");
        for(let edge=M.zero;edge<M.three;edge+=M.one){
          const ends=[key(triangle[edge]),key(triangle[(edge+M.one)%M.three])].sort().join('|');
          edges.set(ends,(edges.get(ends)??M.zero)+M.one);
        }
      }
    }
    assert.ok(hasChamfer,"all edges are mathematically razor sharp");
    assert.ok([...edges.values()].every(count=>count===M.two),"a chamfer leaves an open crack or overlapping face");
    const size = art.bounds.getSize(new THREE.Vector3());
    for(const axis of ['x','y'])assert.ok(Math.abs(size[axis]-F.scale*C.sceneToMeters)<F.tolerance);
  } finally { cleanup(art); }
});
