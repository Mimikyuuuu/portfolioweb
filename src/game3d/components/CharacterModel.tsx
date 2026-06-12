import { useAnimations } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimationClip,
  Color,
  FrontSide,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
  VectorKeyframeTrack,
  type Group,
  type Material,
  type Object3D,
} from 'three';

interface CharacterModelProps {
  isMoving: boolean;
  isSprinting: boolean;
}

const IDLE_ANIMATION = 'IDLE';
const RUN_ANIMATION = 'RUN';
const TEXTURE_FILES = [
  '01.png',
  '02.png',
  '03.png',
  '04.png',
  '05.png',
  '06.png',
  '07.png',
  '08.png',
  '09.png',
  '11.png',
  '12.png',
  '13.png',
  '17.png',
  '18.png',
  '19.png',
  'eye-iris-fill.png',
];
const MATERIAL_TEXTURE_FALLBACKS: Record<string, string> = {
  'Material.001': '12.png',
  'Material.002': '12.png',
  'Material.003': '12.png',
  'Material.004': '12.png',
  'Material.005': '08.png',
  'Material.006': '12.png',
  'Material.007': '04.png', //裙子a
  'Material.008': '06.png',
  'Material.009': '06.png',
  'Material.013': '07.png', //头发
  'mat0.008': '09.png',
};
const MESH_TEXTURE_OVERRIDES: Record<string, string> = {
  mesh0146rip: 'eye-iris-fill.png',
  mesh0176rip: 'eye-iris-fill.png',
};
const DEBUG_EYE_MESH_COLORS = false;
const EYE_MESH_DEBUG_COLORS: Record<string, string> = {
  mesh0144rip: '#920c0c',
  mesh0146rip: '#00ff00',
  mesh0149rip: '#0066ff',
  mesh0100rip: '#fdfd96',
  mesh0108rip: '#ff00ff',
  mesh0176rip: '#00ffff',
  mesh0152rip: '#ff8800',
  mesh0154rip: '#8844ff',
};

type CharacterMaterial = Material & { color?: Color; map?: Texture | null };

export function CharacterModel({ isMoving, isSprinting }: CharacterModelProps) {
  const group = useRef<Group>(null);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const idleModel = useLoader(FBXLoader, '/models/Standing Idle2.fbx', configureCharacterFbxLoader);
  const runningModel = useLoader(FBXLoader, '/models/Running2.fbx', configureCharacterFbxLoader);
  const sourceModel = useLoader(FBXLoader, '/models/untitled.fbx', configureCharacterFbxLoader);
  const loadedTextures = useLoader(
    TextureLoader,
    TEXTURE_FILES.map((fileName) => `/models/textures/${fileName}`),
  );
  const textures = useMemo(() => {
    const textureMap = new Map<string, Texture>();

    for (const [index, texture] of loadedTextures.entries()) {
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = true;
      texture.needsUpdate = true;
      textureMap.set(TEXTURE_FILES[index], texture);
    }

    return textureMap;
  }, [loadedTextures]);
  const sourceMaterials = useMemo(() => collectSourceMaterials(sourceModel, textures), [sourceModel, textures]);
  const animations = useMemo(
    () => {
      const idleAnimation = idleModel.animations[0]?.clone() ?? null;
      const runAnimation = runningModel.animations[0]?.clone() ?? null;

      if (idleAnimation) {
        idleAnimation.name = IDLE_ANIMATION;
        removeRootMotion(idleAnimation);
      }

      if (runAnimation) {
        runAnimation.name = RUN_ANIMATION;
        removeRootMotion(runAnimation);
      }

      return [idleAnimation, runAnimation].filter(Boolean) as AnimationClip[];
    },
    [idleModel.animations, runningModel.animations],
  );

  const { actions } = useAnimations(animations, group);

  idleModel.traverse((child: Object3D) => {
    child.castShadow = true;
    child.receiveShadow = true;
    applyCharacterMaterial(child, sourceMaterials, textures);
  });

  useEffect(() => {
    const targetAnimation = isMoving ? RUN_ANIMATION : IDLE_ANIMATION;
    const nextAction = actions[targetAnimation];

    if (!nextAction) {
      return;
    }

    nextAction.timeScale = isMoving && isSprinting ? 1.25 : 1;

    if (!currentAnimation || currentAnimation === targetAnimation) {
      nextAction.reset().play();
      setCurrentAnimation(targetAnimation);
      return;
    }

    const previousAction = actions[currentAnimation];
    nextAction.reset().play();
    previousAction?.crossFadeTo(nextAction, 0.18, true);
    setCurrentAnimation(targetAnimation);
  }, [actions, currentAnimation, isMoving, isSprinting]);

  return <primitive ref={group} object={idleModel} />;
}

function applyCharacterMaterial(
  child: Object3D & { material?: Material | Material[] },
  sourceMaterials: Map<string, Material | Material[]>,
  textures: Map<string, Texture>,
) {
  if (!child.material) {
    return;
  }

  const sourceMaterial = sourceMaterials.get(normalizeMeshName(child.name));

  if (sourceMaterial) {
    child.material = cloneMaterial(sourceMaterial);
  }

  const meshTextureOverride = textures.get(MESH_TEXTURE_OVERRIDES[normalizeMeshName(child.name)] ?? '');
  const debugColor = DEBUG_EYE_MESH_COLORS ? EYE_MESH_DEBUG_COLORS[normalizeMeshName(child.name)] : undefined;
  const materials = (Array.isArray(child.material) ? child.material : [child.material]) as CharacterMaterial[];

  for (const material of materials) {
    material.transparent = false;
    material.opacity = 1;
    material.alphaTest = 0.35;
    material.depthWrite = true;
    material.depthTest = true;
    material.side = FrontSide;

    if (debugColor && material.color) {
      material.map = null;
      material.color = new Color(debugColor);
    }

    if ('map' in material) {
      material.map = debugColor ? null : meshTextureOverride ?? material.map ?? null;

      if (material.map) {
        material.map.colorSpace = SRGBColorSpace;
        material.map.flipY = true;
        material.map.needsUpdate = true;
      }
    }

    material.needsUpdate = true;
  }
}

function collectSourceMaterials(sourceModel: Object3D, textures: Map<string, Texture>) {
  const materials = new Map<string, Material | Material[]>();

  sourceModel.traverse((child: Object3D & { material?: Material | Material[] }) => {
    if (!child.material) {
      return;
    }

    materials.set(normalizeMeshName(child.name), cloneAndHydrateMaterial(child.material, textures));
  });

  return materials;
}

function cloneMaterial(material: Material | Material[]) {
  return Array.isArray(material) ? material.map((item) => item.clone()) : material.clone();
}

function cloneAndHydrateMaterial(material: Material | Material[], textures: Map<string, Texture>) {
  const cloned = cloneMaterial(material);
  const materials = (Array.isArray(cloned) ? cloned : [cloned]) as CharacterMaterial[];

  for (const item of materials) {
    if (!('map' in item)) {
      continue;
    }

    const mapName = item.map?.name;
    const textureFromMaterialName = textures.get(MATERIAL_TEXTURE_FALLBACKS[item.name] ?? '');
    const textureFromMapName = mapName ? textures.get(textureFileFromDiffuseName(mapName)) : null;
    item.map = textureFromMaterialName ?? textureFromMapName ?? item.map ?? null;

    if (item.map) {
      item.map.colorSpace = SRGBColorSpace;
      item.map.flipY = true;
      item.map.needsUpdate = true;
    }
  }

  return cloned;
}

function textureFileFromDiffuseName(name: string) {
  const match = name.match(/(\d+)$/);

  if (!match) {
    return '';
  }

  return `${match[1].padStart(2, '0')}.png`;
}

function normalizeMeshName(meshName: string) {
  return meshName
    .replace(/\.rip_mesh\d+$/i, 'rip')
    .replace(/\.rip$/i, 'rip')
    .replace(/_/g, '')
    .toLowerCase();
}

function configureCharacterFbxLoader(loader: FBXLoader) {
  loader.manager.setURLModifier((url) => {
    const fileName = decodeURIComponent(url.split('/').pop() ?? '').trim();

    if (/^\d+\.(png|jpe?g|webp)$/i.test(fileName)) {
      return `/models/textures/${fileName}`;
    }

    return url;
  });
}

function removeRootMotion(animation: AnimationClip) {
  animation.tracks = animation.tracks.map((track) => {
    if (!track.name.endsWith('.position') || track.getValueSize() !== 3) {
      return track;
    }

    const values = Array.from(track.values);
    const x0 = values[0] ?? 0;
    const z0 = values[2] ?? 0;

    for (let index = 0; index < values.length; index += 3) {
      values[index] = x0;
      values[index + 2] = z0;
    }

    return new VectorKeyframeTrack(track.name, Array.from(track.times), values);
  });
}
