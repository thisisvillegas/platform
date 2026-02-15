export interface WorldPackSpriteAsset {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
}

export interface WorldPackTilemapAsset {
  key: string;
  path: string;
}

export interface WorldPackAudioAsset {
  key: string;
  path: string;
}

export interface WorldPackAssets {
  sprites: WorldPackSpriteAsset[];
  tilemaps: WorldPackTilemapAsset[];
  audio: WorldPackAudioAsset[];
}

export interface WorldPackBuilding {
  id: string;
  name: string;
  type: 'app' | 'external' | 'info' | 'placeholder';
  appRoute?: string;
  appUrl?: string;
  requiresAuth: boolean;
  description: string;
  interiorMap?: string;
}

export interface WorldPackNPC {
  id: string;
  name: string;
  sprite: string;
  dialogue?: string[];
}

export interface WorldPackTheme {
  name: string;
  music?: string;
  ambience?: string;
}

export interface WorldPackMaps {
  overworld: string;
  interiors?: Record<string, string>;
}

export interface WorldPackManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  tileSize: number;
  assets: WorldPackAssets;
  buildings?: WorldPackBuilding[];
  npcs?: WorldPackNPC[];
  theme?: WorldPackTheme;
  maps?: WorldPackMaps;
  metadata?: Record<string, unknown>;
}
