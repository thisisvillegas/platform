#!/usr/bin/env python3
"""
Enhanced placeholder asset generator for the village world pack.
Pure Python (struct + zlib) — no PIL/Pillow dependency.

Assets generated:
  - Village tileset: 256x32 (16 cols x 2 rows = 32 tiles, 16x16 each)
  - Player spritesheet: 64x64 (4 rows x 4 frames, 16x16 each)
  - NPC spritesheet: 64x64 (same layout, different colors)
  - Village Tiled JSON map: 80x60 tiles (1280x960px)
"""

import struct
import zlib
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'assets', 'worlds', 'village'))

# ─── Tileset layout ──────────────────────────────────────────────────
TILESET_COLS = 16
TILESET_ROWS = 2
TILE_SIZE = 16

# GID constants (firstgid=1, so GID = tileset_index + 1)
EMPTY = 0
GRASS = 2
GRASS_ALT = 3
DIRT = 4
STONE_PATH = 5
WATER = 6
SAND = 7
WALL_STONE = 8
WALL_WOOD = 9
WALL_BRICK = 10
ROOF_RED = 11
ROOF_BLUE = 12
DOOR_TILE = 13
WINDOW = 14
TREE_DARK = 15
TREE_LIGHT = 16
BUSH = 17
FLOWERS_RED = 18
FLOWERS_YEL = 19
FENCE_H = 20
FENCE_V = 21
BARREL = 22
WELL_TILE = 23
SIGN = 24
COLLISION = 25
WALL_WHITE = 26
ROOF_GREEN = 27
GARDEN = 28
COBBLE = 29

MAP_W, MAP_H = 80, 60

BUILDINGS = [
    {'id': 'tavern',       'name': 'The Rusty Pixel',  'x': 5,  'y': 5,  'w': 10, 'h': 7, 'wall': WALL_WOOD,  'roof': ROOF_RED,   'door_off': 4},
    {'id': 'smart-home',   'name': 'Smart Home Hub',   'x': 20, 'y': 6,  'w': 8,  'h': 6, 'wall': WALL_WHITE, 'roof': ROOF_BLUE,  'door_off': 3},
    {'id': 'war-room',     'name': 'The War Room',     'x': 34, 'y': 5,  'w': 9,  'h': 7, 'wall': WALL_STONE, 'roof': ROOF_BLUE,  'door_off': 4},
    {'id': 'greenhouse',   'name': 'The Greenhouse',   'x': 52, 'y': 6,  'w': 8,  'h': 6, 'wall': WALL_WHITE, 'roof': ROOF_GREEN, 'door_off': 3},
    {'id': 'theater',      'name': 'Grand Theater',    'x': 5,  'y': 27, 'w': 12, 'h': 7, 'wall': WALL_BRICK, 'roof': ROOF_RED,   'door_off': 5},
    {'id': 'castle',       'name': 'Castle Villegas',  'x': 40, 'y': 25, 'w': 12, 'h': 9, 'wall': WALL_STONE, 'roof': ROOF_BLUE,  'door_off': 5},
    {'id': 'workshop',     'name': 'The Workshop',     'x': 5,  'y': 44, 'w': 8,  'h': 6, 'wall': WALL_STONE, 'roof': ROOF_RED,   'door_off': 3},
    {'id': 'server-shack', 'name': 'Server Shack',     'x': 20, 'y': 45, 'w': 6,  'h': 5, 'wall': WALL_BRICK, 'roof': ROOF_BLUE,  'door_off': 2},
    {'id': 'about-house',  'name': 'About House',      'x': 35, 'y': 44, 'w': 8,  'h': 6, 'wall': WALL_WOOD,  'roof': ROOF_RED,   'door_off': 3},
    {'id': 'generic',      'name': 'Village Hall',     'x': 52, 'y': 45, 'w': 6,  'h': 5, 'wall': WALL_WOOD,  'roof': ROOF_BLUE,  'door_off': 2},
]

# NPCs with properties matching NPCManager expectations
NPCS = [
    {'id': 'claude',      'displayName': 'Claude',      'building': 'tavern',       'spriteKey': 'npc-claude',   'dialogueId': 'claude-townsquare'},
    {'id': 'guide',       'displayName': 'Guide',       'building': 'smart-home',   'spriteKey': 'npc-villager', 'dialogueId': ''},
    {'id': 'officer',     'displayName': 'Officer',     'building': 'war-room',     'spriteKey': 'npc-villager', 'dialogueId': ''},
    {'id': 'gardener',    'displayName': 'Gardener',    'building': 'greenhouse',   'spriteKey': 'npc-villager', 'dialogueId': ''},
    {'id': 'performer',   'displayName': 'Performer',   'building': 'theater',      'spriteKey': 'npc-villager', 'dialogueId': ''},
    {'id': 'noble',       'displayName': 'Noble',       'building': 'castle',       'spriteKey': 'npc-villager', 'dialogueId': ''},
    {'id': 'craftsman',   'displayName': 'Craftsman',   'building': 'workshop',     'spriteKey': 'npc-villager', 'dialogueId': ''},
    {'id': 'signpost',    'displayName': 'Signpost',    'building': 'server-shack', 'spriteKey': 'npc-signpost', 'dialogueId': 'signpost'},
    {'id': 'villager-01', 'displayName': 'Villager',    'building': 'about-house',  'spriteKey': 'npc-villager', 'dialogueId': 'villager-01'},
    {'id': 'villager-02', 'displayName': 'Villager',    'building': 'generic',      'spriteKey': 'npc-villager', 'dialogueId': ''},
]


# ═══════════════════════════════════════════════════════════════════════
# PNG helpers
# ═══════════════════════════════════════════════════════════════════════

def create_png(width, height, pixels):
    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = _make_chunk(b'IHDR', ihdr_data)
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            r, g, b, a = pixels[y][x]
            raw.extend([r, g, b, a])
    idat = _make_chunk(b'IDAT', zlib.compress(bytes(raw)))
    iend = _make_chunk(b'IEND', b'')
    return signature + ihdr + idat + iend


def _make_chunk(chunk_type, data):
    chunk = chunk_type + data
    return struct.pack('>I', len(data)) + chunk + struct.pack('>I', zlib.crc32(chunk) & 0xFFFFFFFF)


# ═══════════════════════════════════════════════════════════════════════
# Tileset generator (256x32, 32 tiles)
# ═══════════════════════════════════════════════════════════════════════

def generate_tileset():
    W = TILESET_COLS * TILE_SIZE
    H = TILESET_ROWS * TILE_SIZE
    pixels = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def paint(tile_idx, fn):
        col = tile_idx % TILESET_COLS
        row = tile_idx // TILESET_COLS
        ox, oy = col * 16, row * 16
        for y in range(16):
            for x in range(16):
                pixels[oy + y][ox + x] = fn(x, y)

    def noise(base, accent, rate=5):
        return lambda x, y: accent if (x * 7 + y * 13 + base[0]) % rate == 0 else base

    def brick(brick_c, mortar_c, bh=4, bw=8):
        def fn(x, y):
            if y % bh == bh - 1: return mortar_c
            offset = bw // 2 if (y // bh) % 2 else 0
            if (x + offset) % bw == 0: return mortar_c
            return brick_c
        return fn

    def plank(plank_c, line_c, ph=4):
        return lambda x, y: line_c if y % ph == ph - 1 else plank_c

    def roof_pat(base_c, line_c, lh=3):
        return lambda x, y: line_c if (x + y) % lh == 0 else base_c

    # Tile 1: grass
    paint(1, noise((56, 142, 60, 255), (76, 175, 80, 255), 5))
    # Tile 2: grass variant
    paint(2, noise((65, 155, 58, 255), (50, 130, 55, 255), 6))
    # Tile 3: dirt
    paint(3, noise((170, 130, 80, 255), (140, 100, 60, 255), 7))
    # Tile 4: stone path
    paint(4, lambda x, y: (140, 140, 140, 255) if x % 4 == 0 or y % 4 == 0 else (175, 175, 175, 255))
    # Tile 5: water
    paint(5, lambda x, y: (80, 150, 240, 255) if y % 4 < 2 and (x + y * 2) % 6 < 2 else (40, 100, 200, 255))
    # Tile 6: sand
    paint(6, noise((220, 200, 150, 255), (200, 180, 130, 255), 8))
    # Tile 7: wall-stone
    paint(7, brick((100, 100, 110, 255), (130, 130, 130, 255)))
    # Tile 8: wall-wood
    paint(8, plank((140, 95, 50, 255), (110, 75, 40, 255)))
    # Tile 9: wall-brick
    paint(9, brick((160, 70, 50, 255), (190, 170, 140, 255)))
    # Tile 10: roof-red
    paint(10, roof_pat((150, 50, 40, 255), (170, 65, 50, 255)))
    # Tile 11: roof-blue
    paint(11, roof_pat((50, 60, 120, 255), (70, 80, 145, 255)))

    # Tile 12: door
    def door_fn(x, y):
        if x < 2 or x > 13 or y < 1: return (90, 60, 30, 255)
        if x == 11 and y == 8: return (200, 180, 80, 255)
        return (120, 80, 40, 255)
    paint(12, door_fn)

    # Tile 13: window
    def window_fn(x, y):
        if x < 2 or x > 13 or y < 2 or y > 13: return (90, 70, 50, 255)
        if x in (7, 8) or y in (7, 8): return (80, 65, 45, 255)
        return (120, 180, 230, 255)
    paint(13, window_fn)

    # Tile 14: tree-dark
    def tree_dark_fn(x, y):
        if y >= 11 and 6 <= x <= 9: return (90, 55, 25, 255)
        r = ((x - 7) ** 2 + (y - 5) ** 2) ** 0.5
        if r <= 6 and y < 12: return (45, 120, 45, 255) if (x + y) % 4 == 0 else (30, 100, 30, 255)
        return (0, 0, 0, 0)
    paint(14, tree_dark_fn)

    # Tile 15: tree-light
    def tree_light_fn(x, y):
        if y >= 11 and 6 <= x <= 9: return (100, 65, 30, 255)
        r = ((x - 7) ** 2 + (y - 5) ** 2) ** 0.5
        if r <= 6 and y < 12: return (80, 180, 70, 255) if (x + y) % 3 == 0 else (60, 160, 50, 255)
        return (0, 0, 0, 0)
    paint(15, tree_light_fn)

    # Tile 16: bush
    def bush_fn(x, y):
        r = ((x - 7) ** 2 + (y - 9) ** 2 * 1.5) ** 0.5
        if r <= 5: return (50, 140, 45, 255) if (x + y) % 3 == 0 else (40, 120, 40, 255)
        return (0, 0, 0, 0)
    paint(16, bush_fn)

    # Tile 17: flowers-red
    def flowers_red_fn(x, y):
        if y < 10 and (x * 5 + y * 3) % 7 == 0: return (200, 50, 50, 255)
        return (76, 175, 80, 255) if (x * 7 + y * 13) % 11 == 0 else (56, 142, 60, 255)
    paint(17, flowers_red_fn)

    # Tile 18: flowers-yellow
    def flowers_yel_fn(x, y):
        if y < 10 and (x * 3 + y * 7) % 6 == 0: return (240, 220, 60, 255)
        return (76, 175, 80, 255) if (x * 7 + y * 13) % 11 == 0 else (56, 142, 60, 255)
    paint(18, flowers_yel_fn)

    # Tile 19: fence-h
    def fence_h_fn(x, y):
        if 6 <= y <= 9: return (130, 85, 45, 255) if y in (6, 9) else (150, 105, 55, 255)
        if x in (0, 15) and 3 <= y <= 12: return (110, 70, 35, 255)
        return (0, 0, 0, 0)
    paint(19, fence_h_fn)

    # Tile 20: fence-v
    def fence_v_fn(x, y):
        if 6 <= x <= 9: return (130, 85, 45, 255) if x in (6, 9) else (150, 105, 55, 255)
        if y in (0, 15) and 3 <= x <= 12: return (110, 70, 35, 255)
        return (0, 0, 0, 0)
    paint(20, fence_v_fn)

    # Tile 21: barrel
    def barrel_fn(x, y):
        r = ((x - 7) ** 2 + (y - 7) ** 2) ** 0.5
        if r <= 6:
            if y in (3, 11): return (80, 50, 20, 255)
            return (100, 65, 30, 255) if r > 5 else (140, 90, 40, 255)
        return (0, 0, 0, 0)
    paint(21, barrel_fn)

    # Tile 22: well
    def well_fn(x, y):
        r = ((x - 7) ** 2 + (y - 7) ** 2) ** 0.5
        if r <= 3: return (30, 40, 80, 255)
        if r <= 6: return (140, 140, 150, 255)
        return (0, 0, 0, 0)
    paint(22, well_fn)

    # Tile 23: sign-post
    def sign_fn(x, y):
        if 7 <= x <= 8 and 8 <= y <= 15: return (100, 65, 30, 255)
        if 3 <= x <= 12 and 2 <= y <= 7:
            if x in (3, 12) or y in (2, 7): return (110, 75, 35, 255)
            return (180, 160, 120, 255)
        return (0, 0, 0, 0)
    paint(23, sign_fn)

    # Tile 24: collision marker
    paint(24, lambda x, y: (255, 0, 0, 80))
    # Tile 25: wall-white
    paint(25, noise((230, 230, 225, 255), (215, 215, 210, 255), 9))
    # Tile 26: roof-green
    paint(26, roof_pat((40, 130, 50, 255), (55, 150, 65, 255)))

    # Tile 27: garden plot
    def garden_fn(x, y):
        if y % 4 < 2:
            if x % 6 == 3 and y % 4 == 0: return (50, 160, 50, 255)
            return (110, 75, 40, 255)
        return (90, 60, 30, 255)
    paint(27, garden_fn)

    # Tile 28: cobblestone
    paint(28, lambda x, y: (100, 95, 90, 255) if x % 5 == 0 or y % 4 == 0 else (165, 160, 155, 255))

    return create_png(W, H, pixels)


# ═══════════════════════════════════════════════════════════════════════
# Character spritesheet (64x64, 4 rows x 4 frames, 16x16 per frame)
# ═══════════════════════════════════════════════════════════════════════

def generate_character(body_color, skin, hair, shoe):
    W, H = 64, 64
    pixels = [[(0, 0, 0, 0)] * W for _ in range(H)]
    for row in range(4):
        for frame in range(4):
            ox, oy = frame * 16, row * 16
            # Hair
            for y in range(oy + 1, oy + 4):
                for x in range(ox + 5, ox + 11):
                    pixels[y][x] = hair
            # Head
            for y in range(oy + 4, oy + 8):
                for x in range(ox + 5, ox + 11):
                    pixels[y][x] = skin
            # Eyes
            eye = (30, 30, 30, 255)
            if row == 0:
                pixels[oy + 5][ox + 6] = eye; pixels[oy + 5][ox + 9] = eye
            elif row == 1:
                pixels[oy + 5][ox + 6] = eye
            elif row == 2:
                pixels[oy + 5][ox + 9] = eye
            # Body
            for y in range(oy + 8, oy + 13):
                for x in range(ox + 4, ox + 12):
                    pixels[y][x] = body_color
            # Legs
            shift = [-1, 0, 1, 0][frame]
            for y in range(oy + 13, oy + 16):
                for x in range(ox + 5 + shift, ox + 7 + shift):
                    if 0 <= x < W: pixels[y][x] = shoe
                for x in range(ox + 9 - shift, ox + 11 - shift):
                    if 0 <= x < W: pixels[y][x] = shoe
    return create_png(W, H, pixels)


# ═══════════════════════════════════════════════════════════════════════
# Village map generator (80x60)
# ═══════════════════════════════════════════════════════════════════════

def generate_village_map():
    def idx(x, y):
        return y * MAP_W + x

    ground = [GRASS] * (MAP_W * MAP_H)
    buildings = [EMPTY] * (MAP_W * MAP_H)
    decorations = [EMPTY] * (MAP_W * MAP_H)
    collision = [EMPTY] * (MAP_W * MAP_H)
    above_player = [EMPTY] * (MAP_W * MAP_H)

    # Varied grass
    for y in range(MAP_H):
        for x in range(MAP_W):
            if (x + y) % 7 == 0:
                ground[idx(x, y)] = GRASS_ALT

    # Roads
    for y in range(19, 21):
        for x in range(3, 77): ground[idx(x, y)] = DIRT
    for y in range(41, 43):
        for x in range(3, 77): ground[idx(x, y)] = DIRT
    for x in range(30, 32):
        for y in range(3, 57): ground[idx(x, y)] = DIRT
    for x in range(62, 64):
        for y in range(3, 57): ground[idx(x, y)] = DIRT

    # Village square
    for y in range(16, 24):
        for x in range(27, 35): ground[idx(x, y)] = COBBLE

    # Pond
    for y in range(36, 41):
        for x in range(66, 73):
            if (x - 69) ** 2 + (y - 38) ** 2 <= 16:
                ground[idx(x, y)] = WATER
    for y in range(35, 42):
        for x in range(65, 74):
            if ground[idx(x, y)] != WATER:
                if ((x - 69) ** 2 + (y - 38) ** 2) ** 0.5 <= 5.5:
                    ground[idx(x, y)] = SAND

    # Place buildings
    objects = []
    obj_id = 1

    objects.append({'id': obj_id, 'name': 'player-spawn', 'type': 'spawn',
                    'x': 30 * 16, 'y': 20 * 16, 'width': 16, 'height': 16,
                    'rotation': 0, 'visible': True})
    obj_id += 1

    for bld in BUILDINGS:
        bx, by, bw, bh = bld['x'], bld['y'], bld['w'], bld['h']
        door_x = bx + bld['door_off']

        for ty in range(by, by + bh):
            for tx in range(bx, bx + bw):
                if ty < by + 2:
                    buildings[idx(tx, ty)] = bld['roof']
                elif ty == by + bh - 1 and tx == door_x:
                    buildings[idx(tx, ty)] = DOOR_TILE
                else:
                    buildings[idx(tx, ty)] = bld['wall']
                if not (ty == by + bh - 1 and tx == door_x):
                    collision[idx(tx, ty)] = COLLISION

        # Windows
        for wx in [bx + bw // 4, bx + 3 * bw // 4]:
            if by + 3 < by + bh - 1:
                buildings[idx(wx, by + 3)] = WINDOW

        # Door object
        objects.append({
            'id': obj_id, 'name': f'door-{bld["id"]}', 'type': 'door',
            'x': door_x * 16, 'y': (by + bh) * 16, 'width': 16, 'height': 16,
            'rotation': 0, 'visible': True,
            'properties': [
                {'name': 'buildingId', 'type': 'string', 'value': bld['id']},
                {'name': 'buildingName', 'type': 'string', 'value': bld['name']},
            ]
        })
        obj_id += 1

        # Side path to road
        door_bottom = by + bh
        if door_bottom <= 19:
            for py in range(door_bottom, 19): ground[idx(door_x, py)] = DIRT
        elif door_bottom <= 41:
            for py in range(door_bottom, 41): ground[idx(door_x, py)] = DIRT
        else:
            for py in range(43, by): ground[idx(door_x, py)] = DIRT

    # NPC spawn objects (properties match NPCManager expectations)
    for npc in NPCS:
        bld = next(b for b in BUILDINGS if b['id'] == npc['building'])
        npc_x = (bld['x'] + bld['door_off']) * 16
        npc_y = (bld['y'] + bld['h'] + 2) * 16
        objects.append({
            'id': obj_id, 'name': npc['id'], 'type': 'npc',
            'x': npc_x, 'y': npc_y, 'width': 16, 'height': 16,
            'rotation': 0, 'visible': True,
            'properties': [
                {'name': 'id', 'type': 'string', 'value': npc['id']},
                {'name': 'displayName', 'type': 'string', 'value': npc['displayName']},
                {'name': 'spriteKey', 'type': 'string', 'value': npc['spriteKey']},
                {'name': 'dialogueId', 'type': 'string', 'value': npc['dialogueId']},
            ]
        })
        obj_id += 1

    # Tree border
    for x in range(MAP_W):
        for ry in [0, 1, MAP_H - 2, MAP_H - 1]:
            tt = TREE_DARK if (x + ry) % 3 != 0 else TREE_LIGHT
            buildings[idx(x, ry)] = tt
            collision[idx(x, ry)] = COLLISION
    for y in range(2, MAP_H - 2):
        for cx in [0, 1, MAP_W - 2, MAP_W - 1]:
            tt = TREE_DARK if (cx + y) % 3 != 0 else TREE_LIGHT
            buildings[idx(cx, y)] = tt
            collision[idx(cx, y)] = COLLISION

    # Decorations
    decorations[idx(30, 18)] = WELL_TILE
    for dx, dy in [(14, 10), (15, 10), (12, 48)]:
        decorations[idx(dx, dy)] = BARREL
    decorations[idx(9, 13)] = SIGN
    decorations[idx(45, 35)] = SIGN
    for bx, by in [(3, 14), (4, 14), (16, 8), (17, 8), (48, 10), (49, 10),
                   (3, 35), (4, 35), (70, 14), (71, 14), (75, 30), (75, 31),
                   (3, 50), (4, 50), (45, 50), (46, 50)]:
        if 2 < bx < MAP_W - 2 and 2 < by < MAP_H - 2:
            decorations[idx(bx, by)] = BUSH
    for fx, fy, ft in [(26, 16, FLOWERS_RED), (35, 16, FLOWERS_YEL),
                       (26, 23, FLOWERS_YEL), (35, 23, FLOWERS_RED),
                       (18, 18, FLOWERS_RED), (18, 21, FLOWERS_YEL),
                       (44, 18, FLOWERS_RED), (44, 21, FLOWERS_YEL)]:
        decorations[idx(fx, fy)] = ft

    # Garden near greenhouse
    for gy in range(13, 17):
        for gx in range(52, 60):
            if buildings[idx(gx, gy)] == EMPTY and collision[idx(gx, gy)] == EMPTY:
                decorations[idx(gx, gy)] = GARDEN
    for gx in range(51, 61):
        if buildings[idx(gx, 12)] == EMPTY: decorations[idx(gx, 12)] = FENCE_H
        if buildings[idx(gx, 17)] == EMPTY: decorations[idx(gx, 17)] = FENCE_H
    for gy in range(12, 18):
        if buildings[idx(51, gy)] == EMPTY: decorations[idx(51, gy)] = FENCE_V
        if buildings[idx(60, gy)] == EMPTY: decorations[idx(60, gy)] = FENCE_V

    # Scattered trees
    for tx, ty, tt in [(18, 14, TREE_DARK), (45, 14, TREE_LIGHT), (70, 10, TREE_DARK),
                       (18, 36, TREE_LIGHT), (55, 36, TREE_DARK), (70, 48, TREE_DARK),
                       (38, 36, TREE_LIGHT), (42, 38, TREE_DARK)]:
        if buildings[idx(tx, ty)] == EMPTY:
            buildings[idx(tx, ty)] = tt
            collision[idx(tx, ty)] = COLLISION

    def make_layer(lid, name, data, visible=True):
        return {'id': lid, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0,
                'width': MAP_W, 'height': MAP_H, 'opacity': 1, 'visible': visible, 'data': data}

    return {
        'compressionlevel': -1, 'height': MAP_H, 'width': MAP_W,
        'infinite': False, 'orientation': 'orthogonal', 'renderorder': 'right-down',
        'tileheight': 16, 'tilewidth': 16, 'tiledversion': '1.10.2',
        'type': 'map', 'version': '1.10', 'nextlayerid': 7, 'nextobjectid': obj_id,
        'layers': [
            make_layer(1, 'ground', ground),
            make_layer(2, 'buildings', buildings),
            make_layer(3, 'decorations', decorations),
            make_layer(4, 'collision', collision, False),
            make_layer(5, 'above-player', above_player),
            {'id': 6, 'name': 'objects', 'type': 'objectgroup', 'x': 0, 'y': 0,
             'opacity': 1, 'visible': True, 'objects': objects},
        ],
        'tilesets': [{
            'firstgid': 1, 'columns': TILESET_COLS,
            'image': '../tilesets/village-tileset.png',
            'imageheight': TILESET_ROWS * TILE_SIZE, 'imagewidth': TILESET_COLS * TILE_SIZE,
            'margin': 0, 'name': 'village-tileset', 'spacing': 0,
            'tilecount': TILESET_COLS * TILESET_ROWS, 'tileheight': TILE_SIZE, 'tilewidth': TILE_SIZE,
        }],
    }


if __name__ == '__main__':
    tilesets_dir = os.path.join(ASSETS_DIR, 'tilesets')
    os.makedirs(tilesets_dir, exist_ok=True)
    with open(os.path.join(tilesets_dir, 'village-tileset.png'), 'wb') as f:
        f.write(generate_tileset())
    print('  Created tileset')

    sprites_dir = os.path.join(ASSETS_DIR, 'sprites')
    os.makedirs(sprites_dir, exist_ok=True)
    with open(os.path.join(sprites_dir, 'player.png'), 'wb') as f:
        f.write(generate_character((70, 130, 230, 255), (240, 200, 160, 255), (60, 40, 20, 255), (50, 35, 15, 255)))
    print('  Created player sprite')

    with open(os.path.join(sprites_dir, 'npc.png'), 'wb') as f:
        f.write(generate_character((200, 80, 60, 255), (220, 185, 145, 255), (140, 90, 40, 255), (60, 40, 20, 255)))
    print('  Created npc sprite')

    maps_dir = os.path.join(ASSETS_DIR, 'maps')
    os.makedirs(maps_dir, exist_ok=True)
    with open(os.path.join(maps_dir, 'village.json'), 'w') as f:
        json.dump(generate_village_map(), f, indent=2)
    print('  Created village map')

    print('\nAll assets generated.')
