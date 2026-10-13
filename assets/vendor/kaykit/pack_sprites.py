"""Trim transparent margins and pack baked artist sprites into 2048px atlases."""
from PIL import Image
import pathlib,json,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[3];OUT=ROOT/'public/character'
raw=json.loads((OUT/'manifest.json').read_text())
for old in OUT.glob('hero-*.webp'):old.unlink()
meta={k:raw[k] for k in ['artist','license','source','model']};meta.update(width=128,height=154,ground=109.83,layers=['body','helmet','armor','boots','storm','spear'],atlases=[],atlasSizes=[],clips={})
atlas=Image.new('RGBA',(2048,2048));index=0;x=y=rowh=0
# A one-pixel gutter prevents filtering pixels from adjacent frames.
def flush():
 global atlas,index,x,y,rowh
 temp=pathlib.Path(f'/tmp/kaykit-atlas-{index}.webp');atlas.crop((0,0,2048,min(2048,y+rowh+2))).save(temp,format='WEBP',quality=92,method=6)
 name=f'hero-{index}-{hashlib.sha256(temp.read_bytes()).hexdigest()[:12]}.webp';(OUT/name).write_bytes(temp.read_bytes())
 meta['atlases'].append(name);meta['atlasSizes'].append([2048,min(2048,y+rowh+2)]);index+=1;atlas=Image.new('RGBA',(2048,2048));x=y=rowh=0
for name,clip in raw['clips'].items():
 data={k:clip[k] for k in ['source','frames','duration','loop']};data['sprites']=[];data['directionHashes']=[];meta['clips'][name]=data
 for direction in range(8):
  frames=[];data['sprites'].append(frames)
  for frame in range(clip['frames']):
   body=Image.open(f'/tmp/kaykit-frames/{name}-{direction}-{frame}.png').convert('RGBA')
   if frame==0:data['directionHashes'].append(hashlib.sha256(body.tobytes()).hexdigest())
   gear=Image.open(f'/tmp/kaykit-equipment/{name}-{direction}-{frame}.png').convert('RGBA')
   layers=[body]+[gear.crop((i*160,0,(i+1)*160,192)) for i in range(5)]
   rects=[];frames.append(rects)
   for layer in layers:
    layer=layer.resize((128,154),Image.Resampling.LANCZOS)
    bounds=layer.getchannel('A').getbbox()
    if not bounds:rects.append([0,0,0,0,0,0,0]);continue
    ox,oy,ex,ey=bounds;piece=layer.crop(bounds);w,h=piece.size
    if x+w+2>2048:x=0;y+=rowh+2;rowh=0
    if y+h+2>2048:flush()
    atlas.paste(piece,(x+1,y+1));rects.append([index,x+1,y+1,w,h,ox,oy]);x+=w+2;rowh=max(rowh,h)
flush()
(OUT/'manifest.json').write_text(json.dumps(meta,separators=(',',':')))
(ROOT/'src/generated/character-atlas.ts').write_text('/* Generated from CC0 KayKit models and original clips; see assets/vendor/kaykit. */\nexport type SpriteRect = [number,number,number,number,number,number,number];\nexport type ArtistClip={source:string;frames:number;duration:number;loop:boolean;directionHashes:string[];sprites:SpriteRect[][][]};\nexport const characterAtlas: {artist:string;license:string;source:string;model:string;width:number;height:number;ground:number;layers:string[];atlases:string[];atlasSizes:number[][];clips:Record<string,ArtistClip>} = '+json.dumps(meta,separators=(',',':'))+';\n')
print('Packed',index,'atlases',sum((OUT/n).stat().st_size for n in meta['atlases']),'bytes')
