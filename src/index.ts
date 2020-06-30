declare var module: NodeHotModule;
import { mat4, vec2, vec3, quat, vec4 } from 'gl-matrix';
import { TinGin, TinMesh, TinPlane, TinGrid, TinTexture } from './tingin';

export function init(selector: string) {
  const engine = new TinGin(800, 600);
  engine.setClearColor(vec4.fromValues(0.0, 0.0, 0.0, 1.0));

  //NOTE: create grid for better vsual orientation
  let floor: TinPlane = engine.getScene().createObject('plane');
  floor.setColor(vec4.fromValues(1.0, 1.0, 1.0, 1.0));
  floor.setScale(vec3.fromValues(10.0, 10.0, 10.0));

  //NOTE: create simple sprite from plane
  const sprite: TinPlane = engine.getScene().createObject('plane');
  sprite.setPos(vec3.fromValues(1, 0.0, 1));
  sprite.setScale(vec3.fromValues(0.5, 0.5, 0.5));
  sprite.setTexture(engine.createAndLoadTexture('potion.png'));

  let rot: number = 0;
  engine.run((deltaTime: number)=> {
    const currentPos: vec3 = sprite.getPos();
    sprite.setPos(vec3.fromValues(currentPos[0], 1.0 + Math.sin(rot) * 0.5, currentPos[2]));

    const rotZ = mat4.rotateZ(mat4.create(), mat4.create(), 90 * (Math.PI / 180))
    sprite.setRot(mat4.rotateX(mat4.create(), rotZ, rot));
    rot += deltaTime * 2.5;
  });
}
