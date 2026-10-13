"""Blender 4.3+: editable original hero, IK controls and locomotion actions.
Run: blender -b --python assets/character/build_character.py
Re-export edited actions: blender -b assets/character/hero.blend --python assets/character/export_animation.py
"""
import bpy, math
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=84;scene.frame_start=1;scene.frame_end=36;scene.sync_mode='FRAME_DROP'
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='Hero_Rig';rig.show_in_front=True
bpy.ops.object.mode_set(mode='EDIT');bones=rig.data.edit_bones;bones.remove(bones[0])
def bone(name,head,tail,parent=None,connect=False,deform=True):
 b=bones.new(name);b.head=head;b.tail=tail;b.use_deform=deform
 if parent:b.parent=bones[parent];b.use_connect=connect
 return b
bone('hips',(0,0,.82),(0,0,1.07))
bone('spine',(0,0,1.07),(0,0,1.32),'hips',True)
bone('neck',(0,0,1.32),(0,0,1.47),'spine',True)
bone('head',(0,0,1.47),(0,0,1.67),'neck',True)
for side,sign in [('L',-1),('R',1)]:
 x=sign*.09
 bone('thigh.'+side,(x,0,.82),(x,.035,.43),'hips')
 bone('shin.'+side,(x,.035,.43),(x,0,.065),'thigh.'+side,True)
 bone('foot.'+side,(x,0,.065),(x,.16,.065),'shin.'+side,True)
 bone('foot_ik.'+side,(x,0,.065),(x,.16,.065),deform=False)
 bone('knee_pole.'+side,(x,.8,.4),(x,.8,.55),deform=False)
 x=sign*.21
 bone('upper_arm.'+side,(x,0,1.29),(x,-.02,1.025),'spine')
 bone('forearm.'+side,(x,-.02,1.025),(x,.08,.78),'upper_arm.'+side,True)
 bone('hand_ik.'+side,(x,.08,.78),(x,.08,.91),deform=False)
 bone('elbow_pole.'+side,(x,-.65,1.08),(x,-.65,1.23),deform=False)
bpy.ops.object.mode_set(mode='POSE')
for side in ['L','R']:
 for limb,target,pole in [('shin','foot_ik','knee_pole'),('forearm','hand_ik','elbow_pole')]:
  c=rig.pose.bones[limb+'.'+side].constraints.new('IK');c.name='Anatomical IK';c.target=rig;c.subtarget=target+'.'+side;c.chain_count=2;c.pole_target=rig;c.pole_subtarget=pole+'.'+side;c.use_stretch=False
  # Calibrate the native solver pole in the intended sagittal plane.
  best=(float('inf'),0)
  for angle in [0,math.pi/2,-math.pi/2,math.pi]:
   c.pole_angle=angle;bpy.context.view_layer.update();joint=rig.pose.bones[limb+'.'+side].head
   x=rig.data.bones[limb+'.'+side].head_local.x
   penalty=abs(joint.x-x)*10+(max(0,-joint.y) if limb=='shin' else max(0,joint.y))
   if penalty<best[0]:best=(penalty,angle)
  c.pole_angle=best[1]
for side in ['L','R']:
 c=rig.pose.bones['foot.'+side].constraints.new('COPY_ROTATION');c.target=rig;c.subtarget='foot_ik.'+side;c.owner_space='WORLD';c.target_space='WORLD'
bpy.ops.object.mode_set(mode='OBJECT')
colors={'coat':(.62,.35,.18,1),'pants':(.12,.20,.27,1),'skin':(.78,.53,.32,1),'hair':(.16,.09,.045,1),'scarf':(.56,.69,.4,1),'pack':(.17,.28,.20,1),'boots':(.18,.11,.07,1)}
materials={}
for name,color in colors.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;materials[name]=m
# Original low-poly geometry is bone-parented: every component remains editable.
def piece(name,pos,scale,material,parent,kind='cube'):
 if kind=='sphere':bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=pos)
 else:bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(materials[material]);bpy.context.view_layer.update();matrix=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone=parent;bpy.context.view_layer.update();o.matrix_world=matrix
 bevel=o.modifiers.new('Soft edges','BEVEL');bevel.width=.035;bevel.segments=2
 return o
piece('Coat',(0,0,1.1),(.38,.23,.43),'coat','spine')
piece('Head',(0,.015,1.60),(.17,.145,.20),'skin','head','sphere')
piece('Hair',(0,-.025,1.71),(.175,.15,.105),'hair','head','sphere')
for sign in [-1,1]:
 piece('Eye '+str(sign),(sign*.064,.147,1.64),(.016,.017,.022),'pants','head','sphere')
 piece('Ear '+str(sign),(sign*.17,.0,1.60),(.027,.04,.05),'skin','head','sphere')
piece('Nose',(0,.167,1.60),(.029,.032,.04),'skin','head','sphere')
piece('Mouth',(0,.153,1.54),(.045,.012,.014),'hair','head')
piece('Scarf',(0,0,1.40),(.37,.255,.065),'scarf','neck')
piece('Backpack',(0,-.175,1.12),(.28,.13,.30),'pack','spine')
for side,sign in [('L',-1),('R',1)]:
 x=sign*.09
 piece('Trouser upper '+side,(x,.018,.625),(.12,.13,.40),'pants','thigh.'+side)
 piece('Trouser lower '+side,(x,.018,.245),(.10,.11,.37),'pants','shin.'+side)
 piece('Boot '+side,(x,.065,.055),(.13,.24,.11),'boots','foot.'+side)
 x=sign*.21
 piece('Sleeve upper '+side,(x,-.01,1.157),(.115,.12,.27),'coat','upper_arm.'+side)
 piece('Sleeve lower '+side,(x,.03,.905),(.09,.105,.25),'coat','forearm.'+side)
 piece('Hand '+side,(x,.08,.78),(.058,.055,.065),'skin','forearm.'+side,'sphere')
def smooth(q):return q*q*(3-2*q)
def foot_path(p):
 p=p%1
 if p<.35:
  return .30-(.60/.35)*p,.065+.025*smooth(max(0,(p-.27)/.08)),max(0,(p-.27)/.08)*.18,True
 q=(p-.35)/.65
 return -.30+.60*smooth(q),.065+.29*math.sin(q*math.pi),-.18*math.sin(q*math.pi),False
def hip_height(p):
 g=p% .5
 keys=[(0,.755),(.07,.70),(.20,.735),(.35,.765),(.425,.805),(.50,.755)]
 for (a,z),(b,zz) in zip(keys,keys[1:]):
  if a<=g<=b:return z+(zz-z)*smooth((g-a)/(b-a))
 return .755
rig['cycle_distance']=1.714285714;rig['metres_to_pixels']=54
rig.animation_data_create()
for action,armed in [('Run',False),('Run_Armed',True),('Idle',False)]:
 act=bpy.data.actions.new(action);act.use_fake_user=True;rig.animation_data.action=act
 for frame in range(1,38):
  p=(frame-1)/36;idle=action=='Idle';hips=rig.pose.bones['hips'];hips.location=rig.data.bones['hips'].matrix_local.to_3x3().inverted()@Vector((0,0,(.82 if idle else hip_height(p))-.82));hips.rotation_mode='XYZ';hips.rotation_euler=(0,0,0)
  spine=rig.pose.bones['spine'];spine.rotation_mode='XYZ';spine.rotation_euler=(-.025 if idle else -.16,0,0 if idle else .035*math.sin(p*math.tau))
  neck=rig.pose.bones['neck'];neck.rotation_mode='XYZ';neck.rotation_euler=(.015 if idle else .11,0,0)
  for b in [hips,spine,neck]:b.keyframe_insert('location',frame=frame);b.keyframe_insert('rotation_euler',frame=frame)
  for side,sign in [('L',-1),('R',1)]:
   phase=p+(0 if side=='L' else .5);forward,z,roll,_=foot_path(phase)
   if idle:forward=0;z=.065;roll=0
   control=rig.pose.bones['foot_ik.'+side];control.location=(0,forward,z-.065);control.keyframe_insert('location',frame=frame)
   control.rotation_mode='XYZ';control.rotation_euler=(-roll,0,0);control.keyframe_insert('rotation_euler',frame=frame)
   swing=0 if idle else -math.cos(phase*math.tau)*.19
   if armed and side=='R':swing=-math.cos(phase*math.tau)*.045
   hand=rig.pose.bones['hand_ik.'+side]
   # IK target location is in armature coordinates; the controller has a vertical local Y axis.
   target=Vector((sign*.235,(.245 if armed and side=='R' else .12)+swing,(.82 if idle else hip_height(p))+.30+(0 if idle else .035*math.sin(phase*math.tau))))
   local=rig.data.bones[hand.name].matrix_local.to_3x3().inverted()@(target-rig.data.bones[hand.name].head_local)
   hand.location=local;hand.keyframe_insert('location',frame=frame)
 for curve in act.fcurves:
  for key in curve.keyframe_points:key.interpolation='BEZIER'
  curve.modifiers.new('CYCLES')
rig.animation_data.action=bpy.data.actions['Run'];scene.frame_set(1)
# Convenient editor view and orthographic camera; source includes the actual rig and actions.
bpy.ops.object.camera_add(location=(3,4,2.5));camera=bpy.context.object;camera.name='Preview_Camera';camera.rotation_euler=(Vector((0,0,.85))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.15;scene.camera=camera
scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.world.color=(.045,.07,.085)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
text=bpy.data.texts.new('START_HERE');text.write('Original hero. Select Hero_Rig, Pose Mode. Foot/hand IK controls and knee/elbow poles are editable.\nDope Sheet > Action Editor: Run, Run_Armed, Idle. Frames 1..36 loop; 37 repeats frame 1.\n84 fps, 1.714286 metres travelled per cycle. Export with export_animation.py after editing.\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/character/hero.blend'))
exec(compile((ROOT/'assets/character/export_animation.py').read_text(),str(ROOT/'assets/character/export_animation.py'),'exec'))
