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

// --- Interior scene config types ---

export interface InteriorNPCConfig {
  name: string;
  spriteKey: string;
  dialogueId: string;
  tileX: number;
  tileY: number;
}

export interface InteriorPortalConfig {
  tileX: number;
  tileY: number;
  label: string;
  glowColor: string;
}

export interface InteriorDecoration {
  type: 'table' | 'bookshelf' | 'plant' | 'computer' | 'monitor' | 'poster' | 'lamp' | 'rug' | 'barrel' | 'crate';
  tileX: number;
  tileY: number;
}

export interface InteriorConfig {
  roomWidth: number;
  roomHeight: number;
  floorColor: string;
  wallColor: string;
  accentColor: string;
  npc: InteriorNPCConfig;
  portal?: InteriorPortalConfig;
  decorations: InteriorDecoration[];
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
