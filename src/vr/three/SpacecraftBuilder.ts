import { BuiltSpacecraftScene, SpacecraftId } from '../types.ts';
import { ProceduralTextureSet } from '../utils/proceduralTextures.ts';
import { buildApollo1Scene } from './apollo1.ts';
import { buildApollo13Scene } from './apollo13.ts';
import { buildMirScene } from './mir.ts';

export function buildSpacecraftScene(
  id: SpacecraftId,
  textures: ProceduralTextureSet
): BuiltSpacecraftScene {
  switch (id) {
    case 'apollo1':
      return buildApollo1Scene(textures);
    case 'apollo13':
      return buildApollo13Scene(textures);
    case 'mir':
      return buildMirScene(textures);
  }
}
