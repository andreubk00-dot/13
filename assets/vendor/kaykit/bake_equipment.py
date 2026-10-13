"""Bake the pack's helmet, cuirass, greaves and weapons on the original rig.
Five isolated objects render side by side in one pass; no handmade character geometry.
"""
import bpy,math,pathlib,json
from mathutils import Vector,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[3];TMP=pathlib.Path('/tmp/kaykit-equipment');TMP.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/vendor/kaykit/Knight.glb'))
original=next(o for o in bpy.data.objects if o.type=='ARMATURE')
sources=[['Knight_Helmet'],['Knight_Body'],['Knight_LegLeft','Knight_LegRight'],['1H_Sword'],['arrow']]
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/vendor/kaykit/arrow.gltf'))
arrow=bpy.data.objects['arrow'];sword=bpy.data.objects['1H_Sword'];arrow.parent=original;arrow.parent_type='BONE';arrow.parent_bone=sword.parent_bone;arrow.location=sword.location;arrow.rotation_mode=sword.rotation_mode;arrow.rotation_quaternion=sword.rotation_quaternion@Quaternion((0,1,0),math.pi);arrow.scale=(1.3,1.3,2.4)
for o in bpy.data.objects:
 if o.type=='MESH':o.hide_render=True
rigs=[]
for i,names in enumerate(sources):
 r=original.copy();r.data=original.data.copy();bpy.context.scene.collection.objects.link(r);pivot=bpy.data.objects.new('Facing-'+str(i),None);bpy.context.scene.collection.objects.link(pivot);pivot.location.x=(i-2)*4.4;r.parent=pivot
 for t in r.animation_data.nla_tracks:t.mute=True
 rigs.append(r)
 for name in names:
  mesh=bpy.data.objects[name].copy();bpy.context.scene.collection.objects.link(mesh);mesh.parent=r;mesh.hide_render=False
  for mod in mesh.modifiers:
   if mod.type=='ARMATURE':mod.object=r
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.4;scene.display.shading.color_type='TEXTURE';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.render.film_transparent=True;scene.render.resolution_x=800;scene.render.resolution_y=192;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
camdata=bpy.data.cameras.new('Equipment Camera');cam=bpy.data.objects.new('Equipment Camera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=22;cam.location=(0,-8,6);cam.rotation_euler=(Vector((0,0,1.1))-cam.location).to_track_quat('-Z','Y').to_euler()
clips={'idle':('Idle',16,True),'run':('Running_A',24,True),'punch':('Unarmed_Melee_Attack_Punch_A',16,False),'slash':('1H_Melee_Attack_Slice_Horizontal',16,False),'thrust':('2H_Melee_Attack_Stab',16,False),'harvest':('1H_Melee_Attack_Chop',16,False),'dash':('Dodge_Forward',10,False),'hurt':('Hit_A',10,False),'craft':('Interact',16,False),'pickup':('PickUp',16,False),'respawn':('Lie_StandUp',20,False)}
for name,(source,count,loop) in clips.items():
 action=bpy.data.actions[source+'_Rig']
 for r in rigs:r.animation_data.action=action
 for direction in range(8):
  for r in rigs:r.parent.rotation_euler.z=direction*math.pi/4
  for i in range(count):
   frame=float(action.frame_range[1])*i/(count if loop else count-1);scene.frame_set(int(frame),subframe=frame%1)
   scene.render.filepath=str(TMP/f'{name}-{direction}-{i}.png');bpy.ops.render.render(write_still=True)
  print('EQUIPMENT',name,direction,flush=True)
