#!/usr/bin/env python3
"""
Generate placeholder game assets using pure Python (struct + zlib).
No PIL/Pillow dependency — creates valid PNGs from raw pixel data.

Assets generated:
  - Player spritesheet: 64x64 (4 rows x 4 frames, 16x16 each)
  - Village tileset: 128x16 (8 tiles, 16x16 each)
  - Village Tiled JSON map: 40x30 tiles (640x480px)
"""

import struct
import zlib
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'assets', 'worlds', 'village'))


def create_png(width: int, height: int, pixels: list[list[tuple[int, int, int, int]]]) -> bytes:
    """Create a valid PNG file from RGBA pixel data.

    Args:
        width: Image width in pixels
        height: Image height in pixels
        pixels: 2D list of (R, G, B, A) tuples, indexed [y][x]

    Returns:
        Complete PNG file as bytes
    """
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk: width, height, bit depth (8), color type (6 = RGBA)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = _make_chunk(b'IHDR', ihdr_data)

    # IDAT chunk: filtered scanlines → zlib compressed
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type: None
        for x in range(width):
            r, g, b, a = pixels[y][x]
            raw.extend([r, g, b, a])
    compressed = zlib.compress(bytes(raw))
    idat = _make_chunk(b'IDAT', compressed)

    # IEND chunk
    iend = _make_chunk(b'IEND', b'')

    return signature + ihdr + idat + iend


def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    """Build a PNG chunk with length, type, data, and CRC."""
    chunk = chunk_type + data
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF)


# ---------------------------------------------------------------------------
# Player spritesheet (64x64): 4 rows × 4 frames, 16×16 each
# Rows: down, left, right, up
# ---------------------------------------------------------------------------

def generate_player_spritesheet() -> bytes:
    W, H = 64, 64
    pixels = [[(0, 0, 0, 0)] * W for _ in range(H)]

    # Body colors per direction row
    body_colors = [
        (70, 130, 230, 255),   # down  = blue
        (70, 190, 90, 255),    # left  = green
        (220, 70, 70, 255),    # right = red
        (160, 80, 200, 255),   # up    = purple
    ]
    skin = (240, 200, 160, 255)
    hair_dark = (80, 50, 30, 255)
    shoe = (60, 40, 20, 255)

    for row in range(4):
        color = body_colors[row]
        for frame in range(4):
            ox = frame * 16
            oy = row * 16

            # Hair/top of head (rows 1-3)
            for y in range(oy + 1, oy + 4):
                for x in range(ox + 5, ox + 11):
                    pixels[y][x] = hair_dark

            # Face/head (rows 4-7)
            for y in range(oy + 4, oy + 8):
                for x in range(ox + 5, ox + 11):
                    pixels[y][x] = skin

            # Eyes (row 5) — only for down-facing, dots for others
            if row == 0:  # facing down — show eyes
                pixels[oy + 5][ox + 6] = (30, 30, 30, 255)
                pixels[oy + 5][ox + 9] = (30, 30, 30, 255)
            elif row == 1:  # facing left — one eye on left side
                pixels[oy + 5][ox + 6] = (30, 30, 30, 255)
            elif row == 2:  # facing right — one eye on right side
                pixels[oy + 5][ox + 9] = (30, 30, 30, 255)
            # row 3 (up) — no eyes visible

            # Body/torso (rows 8-12)
            for y in range(oy + 8, oy + 13):
                for x in range(ox + 4, ox + 12):
                    pixels[y][x] = color

            # Legs/feet (rows 13-15) — shift per frame for walk cycle
            foot_offset = (frame % 2) * 2 - 1  # alternates -1 and +1
            # Left foot
            lx = ox + 5 + (foot_offset if frame % 2 == 0 else 0)
            for y in range(oy + 13, oy + 16):
                for x in range(lx, lx + 2):
                    if 0 <= x < W:
                        pixels[y][x] = shoe
            # Right foot
            rx = ox + 9 + (-foot_offset if frame % 2 == 0 else 0)
            for y in range(oy + 13, oy + 16):
                for x in range(rx, rx + 2):
                    if 0 <= x < W:
                        pixels[y][x] = shoe

    return create_png(W, H, pixels)


# ---------------------------------------------------------------------------
# Village tileset (128x16): 8 tiles × 16×16
# [0] transparent, [1] grass, [2] dirt, [3] water,
# [4] building, [5] tree, [6] collision, [7] stone
# ---------------------------------------------------------------------------

def generate_village_tileset() -> bytes:
    W, H = 128, 16
    pixels = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def fill_tile(tile_idx: int, color: tuple[int, int, int, int]):
        ox = tile_idx * 16
        for y in range(H):
            for x in range(ox, ox + 16):
                pixels[y][x] = color

    def set_pixel(tile_idx: int, lx: int, ly: int, color: tuple[int, int, int, int]):
        pixels[ly][tile_idx * 16 + lx] = color

    # Tile 0: transparent (already default)

    # Tile 1: grass — green with variation
    grass_base = (60, 160, 60, 255)
    grass_light = (80, 190, 80, 255)
    fill_tile(1, grass_base)
    # Sprinkle lighter pixels for texture
    for y in range(0, 16, 3):
        for x in range(0, 16, 4):
            set_pixel(1, (x + y) % 16, y, grass_light)

    # Tile 2: dirt — tan/brown
    dirt = (180, 140, 90, 255)
    dirt_dark = (150, 110, 70, 255)
    fill_tile(2, dirt)
    for y in range(0, 16, 4):
        for x in range(0, 16, 5):
            set_pixel(2, (x + y * 2) % 16, y, dirt_dark)

    # Tile 3: water — blue with wave highlights
    water = (40, 100, 200, 255)
    water_light = (80, 150, 240, 255)
    fill_tile(3, water)
    for y in range(0, 16, 3):
        for x in range(2, 14, 4):
            set_pixel(3, x, y, water_light)
            if x + 1 < 16:
                set_pixel(3, x + 1, y, water_light)

    # Tile 4: building — brown with brick lines
    brick = (140, 80, 50, 255)
    mortar = (180, 160, 130, 255)
    fill_tile(4, brick)
    # Horizontal mortar lines every 4 rows
    for y in [3, 7, 11, 15]:
        for x in range(16):
            set_pixel(4, x, y, mortar)
    # Vertical mortar — offset per row
    for row_band in range(4):
        vy = row_band * 4
        offset = 4 if row_band % 2 == 0 else 0
        for x in range(offset, 16, 8):
            for y in range(vy, min(vy + 4, 16)):
                set_pixel(4, x, y, mortar)

    # Tile 5: tree — green canopy top, brown trunk bottom
    canopy = (30, 130, 30, 255)
    canopy_light = (50, 170, 50, 255)
    trunk = (100, 60, 30, 255)
    # Trunk (bottom 6 rows, center 4 pixels)
    for y in range(10, 16):
        for x in range(6, 10):
            set_pixel(5, x, y, trunk)
    # Canopy (top 12 rows, roughly circular)
    for y in range(0, 12):
        # Width narrows toward top
        half_w = max(1, 8 - abs(y - 5))
        cx = 8
        for x in range(cx - half_w, cx + half_w):
            if 0 <= x < 16:
                c = canopy_light if (x + y) % 3 == 0 else canopy
                set_pixel(5, x, y, c)

    # Tile 6: collision marker — semi-transparent red
    fill_tile(6, (255, 0, 0, 100))

    # Tile 7: stone — gray with texture
    stone = (130, 130, 130, 255)
    stone_dark = (100, 100, 100, 255)
    fill_tile(7, stone)
    for y in range(0, 16, 3):
        for x in range(0, 16, 3):
            set_pixel(7, x, y, stone_dark)

    return create_png(W, H, pixels)


# ---------------------------------------------------------------------------
# Tiled JSON map (40x30 = 640x480px)
# ---------------------------------------------------------------------------

def generate_village_map() -> dict:
    MAP_W, MAP_H = 40, 30

    def make_layer(name: str, data: list[int], visible: bool = True) -> dict:
        return {
            "id": 0,  # will be set below
            "name": name,
            "type": "tilelayer",
            "x": 0,
            "y": 0,
            "width": MAP_W,
            "height": MAP_H,
            "opacity": 1,
            "visible": visible,
            "data": data
        }

    # Ground layer: all grass (tile index 2, since firstgid=1 → tile 1 in tileset = index 2)
    # In Tiled format: 0 = empty, firstgid(1) + tileset_index
    # Tileset index 1 (grass) → Tiled GID = 1 + 1 = 2
    # Wait — let me think about this carefully:
    # firstgid = 1, tileset tile 0 = GID 1, tile 1 = GID 2, etc.
    # So grass (tileset index 1) = GID 2
    # But actually the spec says tile indices. Let me re-read:
    # "data is 1D array of tile indices (0 = empty)"
    # In Tiled: 0 = empty, GID = firstgid + local_tile_id
    # Tile 0 in tileset (transparent) = GID 1
    # Tile 1 (grass) = GID 2
    # Tile 4 (building) = GID 5
    # Tile 6 (collision) = GID 7

    EMPTY = 0
    GRASS = 2   # firstgid(1) + tileset_idx(1)
    DIRT = 3
    WATER = 4
    BUILDING = 5
    TREE = 6    # firstgid(1) + tileset_idx(5)
    COLLISION = 7
    STONE = 8

    # Ground: all grass
    ground = [GRASS] * (MAP_W * MAP_H)

    # Add a dirt path from spawn to buildings
    for y in range(12, 18):
        for x in range(10, 30):
            ground[y * MAP_W + x] = DIRT

    # Vertical path
    for y in range(5, 25):
        for x in range(19, 21):
            ground[y * MAP_W + x] = DIRT

    # Buildings layer: a few buildings
    buildings = [EMPTY] * (MAP_W * MAP_H)

    # Building 1: house (6x4 tiles) at top-left area
    for y in range(5, 9):
        for x in range(5, 11):
            buildings[y * MAP_W + x] = BUILDING

    # Building 2: shop (5x3 tiles) at top-right
    for y in range(6, 9):
        for x in range(25, 30):
            buildings[y * MAP_W + x] = BUILDING

    # Building 3: large hall (8x5) at bottom area
    for y in range(22, 27):
        for x in range(12, 20):
            buildings[y * MAP_W + x] = BUILDING

    # Collision layer: matches buildings
    collision = [EMPTY] * (MAP_W * MAP_H)
    for i in range(len(buildings)):
        if buildings[i] == BUILDING:
            collision[i] = COLLISION

    # Clear door openings in collision layer
    # Building 1 door: bottom-center
    collision[8 * MAP_W + 7] = EMPTY
    collision[8 * MAP_W + 8] = EMPTY
    # Building 2 door: bottom-center
    collision[8 * MAP_W + 27] = EMPTY
    # Building 3 door: top-center
    collision[22 * MAP_W + 15] = EMPTY
    collision[22 * MAP_W + 16] = EMPTY

    # Add some trees along edges as natural boundaries
    for x in range(0, MAP_W):
        # Top edge trees
        if x % 3 != 1:
            buildings[0 * MAP_W + x] = TREE
            collision[0 * MAP_W + x] = COLLISION
            buildings[1 * MAP_W + x] = TREE
            collision[1 * MAP_W + x] = COLLISION
        # Bottom edge trees
        if x % 3 != 1:
            buildings[28 * MAP_W + x] = TREE
            collision[28 * MAP_W + x] = COLLISION
            buildings[29 * MAP_W + x] = TREE
            collision[29 * MAP_W + x] = COLLISION
    for y in range(0, MAP_H):
        # Left edge
        if y % 3 != 1:
            buildings[y * MAP_W + 0] = TREE
            collision[y * MAP_W + 0] = COLLISION
            buildings[y * MAP_W + 1] = TREE
            collision[y * MAP_W + 1] = COLLISION
        # Right edge
        if y % 3 != 1:
            buildings[y * MAP_W + 38] = TREE
            collision[y * MAP_W + 38] = COLLISION
            buildings[y * MAP_W + 39] = TREE
            collision[y * MAP_W + 39] = COLLISION

    # Above-player layer: empty (for future rooftops/canopies)
    above_player = [EMPTY] * (MAP_W * MAP_H)

    # Assign IDs
    ground_layer = make_layer("ground", ground)
    ground_layer["id"] = 1

    buildings_layer = make_layer("buildings", buildings)
    buildings_layer["id"] = 2

    collision_layer = make_layer("collision", collision, visible=False)
    collision_layer["id"] = 3

    above_layer = make_layer("above-player", above_player)
    above_layer["id"] = 4

    # Object layer with spawn point and door zone
    object_layer = {
        "id": 5,
        "name": "objects",
        "type": "objectgroup",
        "x": 0,
        "y": 0,
        "opacity": 1,
        "visible": True,
        "objects": [
            {
                "id": 1,
                "name": "player-spawn",
                "type": "spawn",
                "x": 320,
                "y": 240,
                "width": 16,
                "height": 16,
                "rotation": 0,
                "visible": True
            },
            {
                "id": 2,
                "name": "door-zone",
                "type": "door",
                "x": 7 * 16,   # Building 1 door x
                "y": 9 * 16,   # Just below building 1
                "width": 32,
                "height": 16,
                "rotation": 0,
                "visible": True,
                "properties": [
                    {
                        "name": "target",
                        "type": "string",
                        "value": "interior"
                    }
                ]
            }
        ]
    }

    return {
        "compressionlevel": -1,
        "height": MAP_H,
        "width": MAP_W,
        "infinite": False,
        "orientation": "orthogonal",
        "renderorder": "right-down",
        "tileheight": 16,
        "tilewidth": 16,
        "tiledversion": "1.10.2",
        "type": "map",
        "version": "1.10",
        "nextlayerid": 6,
        "nextobjectid": 3,
        "layers": [
            ground_layer,
            buildings_layer,
            collision_layer,
            above_layer,
            object_layer
        ],
        "tilesets": [
            {
                "firstgid": 1,
                "columns": 8,
                "image": "../tilesets/village-tileset.png",
                "imageheight": 16,
                "imagewidth": 128,
                "margin": 0,
                "name": "village-tileset",
                "spacing": 0,
                "tilecount": 8,
                "tileheight": 16,
                "tilewidth": 16
            }
        ]
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == '__main__':
    # Player spritesheet
    sprites_dir = os.path.join(ASSETS_DIR, 'sprites')
    os.makedirs(sprites_dir, exist_ok=True)
    player_path = os.path.join(sprites_dir, 'player.png')
    with open(player_path, 'wb') as f:
        f.write(generate_player_spritesheet())
    print(f'  Created: {player_path}')

    # Village tileset
    tilesets_dir = os.path.join(ASSETS_DIR, 'tilesets')
    os.makedirs(tilesets_dir, exist_ok=True)
    tileset_path = os.path.join(tilesets_dir, 'village-tileset.png')
    with open(tileset_path, 'wb') as f:
        f.write(generate_village_tileset())
    print(f'  Created: {tileset_path}')

    # Village map JSON
    maps_dir = os.path.join(ASSETS_DIR, 'maps')
    os.makedirs(maps_dir, exist_ok=True)
    map_path = os.path.join(maps_dir, 'village.json')
    with open(map_path, 'w') as f:
        json.dump(generate_village_map(), f, indent=2)
    print(f'  Created: {map_path}')

    print('\nAll placeholder assets generated successfully.')
