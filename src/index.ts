declare var module: NodeHotModule;
import { TinGin, TinMesh } from './tingin';

export function init(selector: string) {
  const engine = new TinGin();
  
  const sprite = engine.getScene().createObject('sprite');
  //sprite.loadTexture();

  engine.getScene().createObject('grid');

  engine.run();
}
