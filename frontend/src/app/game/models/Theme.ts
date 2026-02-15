export interface Theme {
  id: string;
  name: string;
  palette: {
    sky?: string;
    overlay?: {
      color: string;
      alpha: number;
    };
  };
  lights: {
    lampTiles: number[];
    intensity: number;
    radius: number;
  };
  windowTiles: {
    day: number[];
    night: number[];
  };
  particles?: {
    type: string;
    density: number;
    speed: number;
    color: string;
  };
  decorationLayers?: string[];
  audio?: {
    ambient?: string;
    music?: string;
  };
  npcOverrides?: {
    [npcId: string]: {
      dialogue: string;
    };
  };
}
