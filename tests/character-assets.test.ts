import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {characterAtlas} from '../src/generated/character-atlas.ts';
const asset=(name:string)=>new URL('../assets/vendor/kaykit/'+name,import.meta.url);
test('the original artist model is intact and includes every selected source animation',()=>{
 const bytes=readFileSync(asset('Rogue.glb'));assert.equal(bytes.subarray(0,4).toString(),'glTF');
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(json.animations.length,76);assert.ok(json.animations.some((a:{name:string})=>a.name==='T-Pose'));
 for(const clip of Object.values(characterAtlas.clips))assert.ok(json.animations.some((a:{name:string})=>a.name===clip.source));
 const sources=JSON.parse(readFileSync(asset('sources.json'),'utf8'));
 for(const [name,hash] of Object.entries(sources.sha256))assert.equal(createHash('sha256').update(readFileSync(asset(name))).digest('hex'),hash);
 assert.match(readFileSync(asset('LICENSE.txt'),'utf8'),/commercial projects/);
});
test('every artist clip has eight distinct camera directions and all equipment layers',()=>{
 for(const clip of Object.values(characterAtlas.clips)){
  assert.equal(clip.sprites.length,8);assert.equal(new Set(clip.directionHashes).size,8,clip.source+' must turn the actual model');
  for(const frames of clip.sprites){assert.equal(frames.length,clip.frames);for(const layers of frames){assert.equal(layers.length,6);assert.ok(layers[0][3]>0&&layers[0][4]>0);}}
 }
});
test('trimmed sprite rectangles fit actual published atlases and the live canvas',()=>{
 for(const file of characterAtlas.atlases)assert.ok(existsSync(new URL('../public/character/'+file,import.meta.url)));
 for(const clip of Object.values(characterAtlas.clips))for(const frames of clip.sprites)for(const layers of frames)for(const [atlas,x,y,w,h,ox,oy] of layers){
  const [width,height]=characterAtlas.atlasSizes[atlas];assert.ok(x+w<=width&&y+h<=height);assert.ok(ox+w<=128&&oy+h<=154);
  assert.ok(104+(ox-64)*1.5>=0&&104+(ox+w-64)*1.5<=208,'horizontal clipping');
  assert.ok(138+(oy-109.83)*1.5>=0&&138+(oy+h-109.83)*1.5<=208,'vertical clipping');
 }
});
