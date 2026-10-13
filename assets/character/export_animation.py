"""Export evaluated Blender IK bone positions; the game consumes these poses directly."""
import bpy,json
from pathlib import Path
ROOT=Path(bpy.data.filepath).resolve().parents[2];rig=bpy.data.objects['Hero_Rig'];scene=bpy.context.scene
names=['hips','spine','neck','head','thigh.L','shin.L','foot.L','thigh.R','shin.R','foot.R','upper_arm.L','forearm.L','upper_arm.R','forearm.R']
clips={}
for action in ['Run','Run_Armed','Idle']:
 rig.animation_data.action=bpy.data.actions[action];frames=[]
 for frame in range(1,37):
  scene.frame_set(frame);evaluated=rig.evaluated_get(bpy.context.evaluated_depsgraph_get());points={}
  for name in names:
   bone=evaluated.pose.bones[name]
   for tag,v in [('head',bone.head),('tail',bone.tail)]:points[name+'.'+tag]=[round(float(x),6) for x in v]
  frames.append(points)
 clips[action]=frames
payload={'fps':84,'frameCount':36,'cycleDistance':float(rig.get('cycle_distance',1.714285714)),'metresToPixels':float(rig.get('metres_to_pixels',54)),'source':'assets/character/hero.blend','clips':clips}
(ROOT/'assets/character/run-cycle.json').write_text(json.dumps(payload,separators=(',',':')))
(ROOT/'src/generated/run-cycle.ts').write_text('// Generated from evaluated Blender bones. Edit hero.blend and re-export.\nexport const runCycle = '+json.dumps(payload,separators=(',',':'))+';\n')
rig.animation_data.action=bpy.data.actions['Run'];scene.frame_set(1)
print('EXPORTED original Blender IK clips:',{k:len(v) for k,v in clips.items()})
