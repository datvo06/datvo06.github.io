"""
SynthesizedWorld: Reverse-engineered grid environment model.

Grid: 13x13
Entities:
  - Gold at (5,0) - static decoration
  - White walls at (0,0),(11,0),(0,1),(11,1) - blocks blue movement
  - Moving reds: start at (5,2),(7,5),(3,7), move DOWN 1 row per tick, disappear off bottom
  - Blue (player): starts at (5,10), moves UP per tick or LEFT/RIGHT via action
  - Static reds: accumulate at col 12 after each death event

Timer mechanism:
  - counter starts at 10 (threshold = 10)
  - Each step: PRE-CHECK if counter >= 10 -> fire tick; THEN apply action credit
  - Credits: noop=1, up=2, down=5/9, left=1, right=1

Tick effects (blue alive):
  - All moving reds move down 1 row (removed if they go past row 12)
  - Blue moves UP 1 row IF action is noop/up/down (clamped at row 0)
  - Blue moves LEFT/RIGHT 1 col IF action is left/right (separately, after tick)
  - Collision check: if blue position == any red -> death (blue removed)

Tick effects (blue dead - "reset tick"):
  - Moving reds reset to initial positions
  - Blue resets to initial position
  - A new static red is added at (12, 12 - death_count) [counting from 0]
  - death_count incremented

Direct action on blue (regardless of tick):
  - left: blue moves left 1 col (if not at edge/wall)
  - right: blue moves right 1 col (if not at edge/wall)
  - others: no direct blue movement (only tick moves blue up)
"""

import sys as _sys
import os as _os

# Allow importing stochastic from the same directory
_code_dir = _os.path.join(_os.getcwd(), 'code')
if _code_dir not in _sys.path:
    _sys.path.insert(0, _code_dir)

try:
    from stochastic import StochasticWorld as _Base
except ImportError:
    import random as _random

    class _Base:
        def __init__(self, seed: int = 42):
            self.rng = _random.Random(seed)
            self.params = {}


class SynthesizedWorld(_Base):
    GRID_SIZE = 13
    THRESHOLD = 10

    # Action timer credits
    CREDITS = {
        'noop': 1,
        'up': 2,
        'down': 5 / 9,
        'left': 1,
        'right': 1,
        'click': 1,
    }

    # Static grid elements (col, row)
    GOLD = (5, 0)
    WHITES = frozenset([(0, 0), (11, 0), (0, 1), (11, 1)])

    # Initial entity positions
    INIT_MOVING_REDS = [(5, 2), (7, 5), (3, 7)]
    INIT_BLUE = (5, 10)

    def __init__(self, seed: int = 42):
        super().__init__(seed)
        self.counter = self.THRESHOLD
        self.moving_reds = list(self.INIT_MOVING_REDS)
        self.static_reds = []
        self.blue = self.INIT_BLUE
        self.blue_dead = False
        self.death_count = 0

    def reset(self) -> str:
        """Reset environment to initial state."""
        self.counter = self.THRESHOLD
        self.moving_reds = list(self.INIT_MOVING_REDS)
        self.static_reds = []
        self.blue = self.INIT_BLUE
        self.blue_dead = False
        self.death_count = 0
        return self._render()

    def step(self, action: str) -> str:
        """Take action, return new grid state."""
        action_key = action.split()[0].lower()
        credit = self.CREDITS.get(action_key, 1)

        # Pre-check: fire tick if counter at or above threshold
        if self.counter >= self.THRESHOLD:
            self.counter -= self.THRESHOLD
            self._fire_tick(action_key)

        # Direct blue movement from action (left/right move blue regardless of tick)
        if not self.blue_dead and self.blue is not None:
            if action_key == 'left':
                self._move_blue_horizontal(-1)
            elif action_key == 'right':
                self._move_blue_horizontal(1)

        self.counter += credit
        return self._render()

    def _fire_tick(self, action_key: str):
        """Process one tick event."""
        if self.blue_dead:
            # Reset the board after a death
            new_row = 12 - self.death_count  # 12, 11, 10, ... for each death
            self.death_count += 1
            self.moving_reds = list(self.INIT_MOVING_REDS)
            if 0 <= new_row < self.GRID_SIZE:
                self.static_reds.append((12, new_row))
            self.blue = self.INIT_BLUE
            self.blue_dead = False
        else:
            GS = self.GRID_SIZE

            # Move all moving reds down 1 row; remove if they exit the bottom
            new_reds = []
            for (cx, cy) in self.moving_reds:
                ny = cy + 1
                if ny < GS:
                    new_reds.append((cx, ny))
                # else: red exits at bottom and disappears
            self.moving_reds = new_reds

            # Move blue: UP for noop/up/down actions; skipped for left/right
            if action_key not in ('left', 'right'):
                bx, by = self.blue
                new_by = by - 1
                if new_by >= 0 and (bx, new_by) not in self.WHITES:
                    self.blue = (bx, new_by)
                # else: blue stays clamped at row 0 or blocked by wall

            # Collision check: blue overlaps with any red -> death
            all_reds = set(self.moving_reds) | set(self.static_reds)
            if self.blue in all_reds:
                self.blue_dead = True
                self.blue = None

    def _move_blue_horizontal(self, dx: int):
        """Move blue left (dx=-1) or right (dx=+1) if not blocked."""
        if self.blue is None:
            return
        bx, by = self.blue
        nx = bx + dx
        ny = by
        if 0 <= nx < self.GRID_SIZE and 0 <= ny < self.GRID_SIZE:
            if (nx, ny) not in self.WHITES:
                self.blue = (nx, ny)

    def _render(self) -> str:
        """Render current state to text grid."""
        GS = self.GRID_SIZE
        grid = [['black'] * GS for _ in range(GS)]

        # Gold (static decoration)
        gx, gy = self.GOLD
        grid[gy][gx] = 'gold'

        # White walls
        for (wx, wy) in self.WHITES:
            grid[wy][wx] = 'white'

        # Moving reds
        for (rx, ry) in self.moving_reds:
            if 0 <= rx < GS and 0 <= ry < GS:
                grid[ry][rx] = 'red'

        # Static reds
        for (rx, ry) in self.static_reds:
            if 0 <= rx < GS and 0 <= ry < GS:
                grid[ry][rx] = 'red'

        # Blue player
        if self.blue is not None:
            bx, by = self.blue
            if 0 <= bx < GS and 0 <= by < GS:
                grid[by][bx] = 'blue'

        return '\n'.join(' '.join(row) for row in grid)
