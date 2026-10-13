"""Render the unmodified CC0 KayKit Rogue and its original skeletal clips for Phaser.
Run: blender -b --python assets/vendor/kaykit/bake_character.py
"""
import bpy, math, json, pathlib
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=pathlib.Path(__file__).resolve().parents[3]
OUT=ROOT/'public/character'; OUT.mkdir(parents=True,exist_ok=True)
TMP=pathlib.Path('/tmp/kaykit-frames');TMP.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/vendor/kaykit/Rogue.glb'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
pivot=bpy.data.objects.new('Facing',None);bpy.context.scene.collection.objects.link(pivot);rig.parent=pivot
for o in bpy.data.objects:
 if o.type=='MESH' and not o.name.startswith('Rogue_'):o.hide_render=True
for track in rig.animation_data.nla_tracks: track.mute=True
scene=bpy.context.scene
scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.4
scene.display.shading.color_type='TEXTURE';scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH'
scene.display.shading.curvature_ridge_factor=1.2;scene.display.shading.curvature_valley_factor=1.0
scene.render.film_transparent=True
scene.render.resolution_x=160;scene.render.resolution_y=192;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
camdata=bpy.data.cameras.new('Sprite Camera');cam=bpy.data.objects.new('Sprite Camera',camdata);scene.collection.objects.link(cam);scene.camera=cam
camdata.type='ORTHO';camdata.ortho_scale=4.4
cam.location=(0,-8,6);target=Vector((0,0,1.1));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
clips={'idle':('Idle',16,True),'run':('Running_A',24,True),'punch':('Unarmed_Melee_Attack_Punch_A',16,False),'slash':('1H_Melee_Attack_Slice_Horizontal',16,False),'thrust':('2H_Melee_Attack_Stab',16,False),'harvest':('1H_Melee_Attack_Chop',16,False),'dash':('Dodge_Forward',10,False),'hurt':('Hit_A',10,False),'craft':('Interact',16,False),'pickup':('PickUp',16,False),'respawn':('Lie_StandUp',20,False)}
meta={'artist':'Kay Lousberg','license':'CC0-1.0','source':'https://kaylousberg.itch.io/kaykit-adventurers','model':'Rogue','width':160,'height':192,'directions':8,'clips':{}}
# Front is world down. Sprite cameras stay fixed; rotate the imported rig in 45 degree steps.
for name,(source,count,loop) in clips.items():
 action=bpy.data.actions[source+'_Rig'];rig.animation_data.action=action
 duration=float(action.frame_range[1])/24
 item={'source':source,'frames':count,'duration':duration,'loop':loop,'anchors':[]};meta['clips'][name]=item
 for direction in range(8):
  pivot.rotation_euler.z=direction*math.pi/4
  anchors=[]
  for i in range(count):
   frame=float(action.frame_range[1])*i/(count if loop else count-1)
   scene.frame_set(int(frame),subframe=frame%1)
   bpy.context.view_layer.update()
   points={}
   for bone in ['handslot.r','head','chest','foot.l','foot.r']:
    b=rig.pose.bones[bone];v=world_to_camera_view(scene,cam,rig.matrix_world@b.head)
    tip=world_to_camera_view(scene,cam,rig.matrix_world@b.tail)
    points[bone]=[round(v.x*160,2),round((1-v.y)*192,2),round(tip.x*160,2),round((1-tip.y)*192,2)]
   anchors.append(points)
   scene.render.filepath=str(TMP/f'{name}-{direction}-{i}.png')
   bpy.ops.render.render(write_still=True)
  item['anchors'].append(anchors)
  print('BAKED',name,direction,flush=True)
(OUT/'manifest.json').write_text(json.dumps(meta,separators=(',',':')))
# Keep the original imported mesh, original actions and render setup editable.
pivot.rotation_euler.z=0;rig.animation_data.action=bpy.data.actions["Idle_Rig"];scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/vendor/kaykit/hero.blend'),compress=True)
