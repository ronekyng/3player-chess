# 3D Three-Player Chess | Design Document
> Version: V0.1.0
> Summary: Three mutually perpendicular **8×8** orthogonal board planes, with boundary rivers between the boards; pieces on the connecting axes (`AXIS_COL=0`) can cross a river via dashed arcs: Rook, Cannon and Pawn move straight along continuous channels, the Horse makes a 3D cross-plane knight (L) move; three-way FFA free-for-all.
> Document purpose: rule definition, Demo (`index.html` / `index-2d.html`) development and gameplay reference.
> Language: [中文原版](readme.md) | English — in case of discrepancy, the Chinese original prevails.

## Table of Contents
1. Board Geometry & Structure
2. Global Iron Rules
3. Piece Definitions & Complete Movement Rules
4. Turns, Check, Capture, Elimination & Victory
5. Opening Layout
6. Glossary
7. Demo Implementation Notes
8. Open Questions

---

## 1. Board Geometry & Structure
### 1.1 Three Orthogonal Planes
- XY plane: Red's native board
- XZ plane: Blue's native board
- YZ plane: Yellow's native board

Each board is an **8×8** grid (`col, rank ∈ [0,7]`). The three boards do not touch: gaps separate each board edge from the coordinate planes (GAP=0.71, river width ≈ 1 square). The **(0,0) corners of the three boards face one another across the rivers at the origin**; at the origin sits the **Central Hub** (a cyan sphere, where the three rivers meet).

Grid lines:
- Within the boards, the mutually facing grid lines of the red and blue boards are purple — this is the purple continuous channel;
- Within the boards, the mutually facing grid lines of the red and yellow boards are orange — this is the orange continuous channel;
- Within the boards, the mutually facing grid lines of the blue and yellow boards are green — this is the green continuous channel;



- Magenta dashed arcs: X-axis river (Red↔Blue)
- Orange dashed arcs: Y-axis river (Red↔Yellow)
- Green dashed arcs: Z-axis river (Blue↔Yellow)

> Solid lines are in-plane grid lines; dashed arcs are the central transition curves.

### 1.2 Board River Boundary Lines & Boundary Rivers (AXIS_COL=0)
- **Board river boundary line = each board's inner edge line 0 (the vertical line at `col=AXIS_COL=0` and the horizontal line at `rank=AXIS_COL=0`)** — i.e., the two inner-edge grid lines adjacent to the rivers (highlighted in the rendering).
- Each grid line joins the corresponding line of the adjacent board via dashed arcs into **one continuous channel** (the line on the far board and this line are treated as the same line):
  - Red board rank0 line ↔ Blue board rank0 line (col c ↔ col c)
  - Red board col0 line ↔ Yellow board rank0 line (rank r ↔ col r)
  - Blue board col0 line ↔ Yellow board col0 line (rank r ↔ rank r)

### 1.3 Cross-Plane Prerequisites
Rook, Cannon, Horse and Pawn can cross rivers; all other pieces cannot:
- Rook/Cannon: may travel straight along any continuous channel;
- Horse: while standing on a board river boundary line, may make a 3D cross-plane knight move (see §3.4);
- **A Pawn counts as "crossed" the moment it steps onto any opponent's board river boundary line**, gaining river-crossing (cross-plane) movement qualification and lateral movement ability (see §3.5).


---

## 2. Global Iron Rules (Unmodifiable)
1. ❌ **No cross-plane check**: an attack affects the enemy King only when the piece and the enemy King are on the **same plane**; pieces on other planes cannot threaten a King on another plane.
2. ❌ King, Advisor and Elephant are **locked to their native plane** and may never cross planes.
3. ⚔️ FFA free-for-all: no forced alliances; players may cooperate temporarily and backstab at any time.
4. Capturing is allowed when the destination square holds an ordinary enemy piece.

---

## 3. Piece Definitions & Complete Movement Rules
> Piece types: King, Advisor, Elephant, Horse, Rook, Cannon, Pawn

### 3.1 King / Advisor / Elephant
1. These pieces operate only within their own native plane; the King and Advisor operate in the **corner palace [5,7]×[5,7]** (the board's outer corner, far from the hub). Within the corner palace the King may move freely along both the tián (□ 2×2-square diagonal) and mǐ (✳ long-diagonal star) patterns; the Advisor moves along grid lines only and may not use the mǐ diagonals — a departure from traditional movement.
2. **Elephant**: tián (two-square diagonal) step, subject to the blocked-elephant-eye rule; **it may never step onto a connecting axis (`col=0` or `rank=0`)** — the corner-localized version of the traditional "cannot cross the river"; it therefore can never cross planes.
3. King, Advisor and Elephant can never cross a river.

### 3.2 Rook
1. Within a plane: traditional rook — moves straight along grid rows/columns, cannot jump over pieces.
2. Once on a connecting axis: may travel straight across the river along the entire continuous channel (solid lines + dashed arc) in a single move; one move follows exactly one same-color channel and may not switch lines or turn mid-route; pieces on the path block it (encountering a piece on the channel: the enemy piece may be captured / the Rook is blocked).

### 3.3 Cannon
1. Movement is identical to the Rook's: it may cross rivers over long distances along continuous channels.
2. Capture rule: along the channel there must be **exactly 1 screen (cannon platform)** between the Cannon and the target; the screen may sit on any plane (including the far bank of a river-crossing segment).

### 3.4 Horse (Key Piece)
Both move types are legal; each is completed in a single move and never split across turns:
1. **2D knight move (any position)**: the traditional L-shape within a plane; the leg-block check considers only the origin square.
2. **3D cross-plane knight move (arc-unfolded knight move)**: available only when the Horse stands on a **board river boundary line**. This board's river boundary line, grid lines, the dashed arc, the opposing board's river boundary line and its grid lines together compose a 3D cross-plane knight move, which the Horse may then make.
> ✅ Leg-block check: only the adjacent point(s) on the **origin surface** perpendicular to the crossing direction are checked — `(c±1, 0)` (or `(0, r±1)`); if blocked, both 3D knight moves in that direction are unavailable. The arrival surface imposes no additional check.
> Landing: may not land on a friendly piece; may capture ordinary enemy pieces; may not land cross-plane (cross-board) on an opponent's King.

### 3.5 Pawn (Key Piece)
1. **Not yet crossed (has not stepped onto an opponent's board river boundary line)**: may only advance toward the hub (`-col` or `-rank`, an L-shaped advance), one square per step, no lateral movement.
2. **Stepping onto either of the other two players' board river boundary lines** counts as crossing (**persistent state** `isExiled`, kept permanently), granting:
   - Lateral movement: side-steps along `col+rank` isolines (`(1,-1)` / `(-1,1)`), **never backward**;
   - River-crossing qualification: continuing to advance crosses the arc into the adjacent board.
3. **Exiled (left home)**: once a Pawn leaves its native plane it is marked `isExiled` and is **permanently forbidden from returning to its native plane**; it may only shuttle between the other two opponents' planes. An exiled Pawn counts as crossed and keeps its lateral movement inside enemy planes.
4. Inside an enemy plane: the advance direction follows the current plane (always toward that board's hub corner `(0,0)`).

---

## 4. Turns, Check, Capture, Elimination & Victory
### 4.1 Turn Order
Red (XY) → Blue (XZ) → Yellow (YZ), cyclic. Eliminated players are skipped automatically.

### 4.2 Check Detection
1. Only attacks from pieces on the **same plane** can produce check; cross-plane pieces cannot check a King on another plane.
2. A player in check must resolve the check on their turn; a move that leaves their own King still in check is illegal (moving into check is not allowed).
3. A checkmated player loses the game and exits: their **Pawns, Horses, Rooks and Cannons transfer to the checking player, while their King, Advisors and Elephants are removed**; the checking player takes command of them. The remaining two players continue. **Once only two players remain, a check against either side wins the game outright for the checking side.**

### 4.3 Capture Rules
1. Ordinary capture: if the destination square holds an ordinary enemy piece, the piece moves there and the enemy piece is removed.
2. Cannon capture: must satisfy the screen condition (the screen may be across a river).
3. Capturing an opponent's King constitutes a **check**.

### 4.4 No Legal Moves
If it is a player's turn, they are **not in check**, but they have no legal move → **skip that turn** (the game continues).

### 4.5 Elimination
If a player's King is in check with **no legal response available** (checkmate) → that player is eliminated immediately.
> Elimination effect: the player's **Pawns, Horses, Rooks and Cannons transfer to the checking player; their King, Advisors and Elephants are removed**.

### 4.6 Victory Condition
The game continues until **only one surviving player remains**; that player wins. If the outcome cannot be determined, the game is a draw.

---

## 5. Opening Layout (8×8 Corner Deployment)
All three players use an identical layout, each on its own native plane. The entire army is grouped at the **(7,7) corner** (the outer corner away from the hub), lined along the col7/rank7 wings on the back rank, with Pawns and Cannons advancing toward the central hub `(0,0)`. **No piece stands on a board river boundary line at the start.**

| Line | Deployment (col, rank) |
| ---- | ---- |
| Back rank (L-shaped wings, 9 pieces) | Rook(7,3) Horse(7,4) Elephant(7,5) Advisor(7,6) **King(7,7)** Advisor(6,7) Elephant(5,7) Horse(4,7) Rook(3,7) |
| Cannon ×3 | Edge cannons (6,2), (2,6) — each one step **directly behind** Pawns (5,1), (1,5); center-intersection cannon (3,3) — behind Pawn (1,1), deliberately off the edge cannons' lines to avoid being captured in the opening |
| Pawn ×7 (L-shaped front line) | (7,1) (5,1) (3,1) (1,1) (1,3) (1,5) (1,7) — every other square along col1 and rank1 |

- Each player fields **19 pieces**: 1 King + 2 Advisors + 2 Elephants + 2 Horses + 2 Rooks + 3 Cannons + 7 Pawns; **57 pieces** in total.
- Design intent: edge cannons hidden behind Pawns, the center cannon shielded by a Pawn — avoiding "opening cannon duels with no clamp".
- Layout diagram reference: ![3D board layout](./docs/3D.png).

---

## 6. Glossary
| Term | Description |
| ---- | ---- |
| Native plane | Each player's exclusive board plane (Red XY / Blue XZ / Yellow YZ) |
| Board river boundary line | Each board's inner edge line 0 (`col=0` and `rank=0`, `AXIS_COL=0`) |
| Boundary river | The gaps between the three boards: X-axis river (Red↔Blue, purple), Y-axis river (Red↔Yellow, orange), Z-axis river (Blue↔Yellow, green) |
| Dashed arc | An arc inside a river connecting the two facing grid lines of adjacent boards, forming a single continuous channel |
| Central hub | The three-river junction at the origin (cyan); the boards' (0,0) corners face one another across the rivers |
| Crossed river (Pawn) | The exiled Pawn: a Pawn crosses the moment it steps onto an opponent's board river boundary line; persistent state (`isExiled`), gains lateral movement + river-crossing qualification, and may never return to its native plane |
| 2D knight move | The Horse's traditional L-shape move within a single plane |
| 3D cross-plane knight move | The Horse's arc-crossing knight move on the axis lines (arc-unfolded knight move) |
| Leg-block | Only the leg-block points on the Horse's origin surface are checked; the river-crossing segment and the arrival surface are not checked |
| Corner palace | The King/Advisor activity zone [5,7]×[5,7], at the board's outer corner away from the hub |

---

## 7. Demo Implementation Notes
### 7.1 Files
| File | Description |
| ---- | ---- |
| `chess-rules.js` | **Shared rules engine**: constants (incl. `AXIS_COL`), deployment, move generation, check/checkmate detection, move execution. The 3D and 2D versions load this same file, guaranteeing identical rules |
| `index.html` | 3D version, opens directly in a browser (requires internet for the Three.js CDN) |
| `index-2d.html` | 2D mode (Canvas 2D) with two layouts — **2D-1 star view** (modeled on the layout diagram) and **2D-2 L-shaped view** — switchable via in-page buttons; cross-switch buttons link it with the 3D version |
| `rules-test.js` | Core rules regression tests (42 items); run with `node rules-test.js`, loads the shared engine directly |
| `serve.js` | **Minimal local static server** (optional, local demo only): run `node serve.js`, then visit http://127.0.0.1:8642 — listens on the local loopback interface only, with path-traversal protection. Opening `index.html` directly in a browser also works; via this server the 2D version is fully playable offline (the 3D version still needs internet for the Three.js CDN) |


### 7.2 Tech Stack
Rules layer: vanilla JS (`chess-rules.js`, shared by both versions).
Rendering layer: 3D version = HTML + CSS + Three.js (r128 CDN); 2D version = HTML + CSS + Canvas 2D. Tests: Node.js.

### 7.3 Piece Data Structure
```javascript
{
  type: "horse",            // king/advisor/elephant/horse/rook/cannon/pawn
  owner: "red",             // red / blue / green
  plane: "XY",              // current plane: XY / XZ / YZ
  col: 3, rank: 5,          // in-plane coordinates (0-7, 0-7)
  isExiled: false,          // pawn-only: true = crossed/exiled, may not return to the native plane
}
```

### 7.4 Interaction
1. **The active player's board always sits at the bottom of the screen**: on turn change the view auto-rotates — in 2D-1 star view the whole layout rotates ±120° (0.55s easing); in 2D-2 the three boards swap slots (active player → bottom, next player → right, previous player → top, 280ms cross-fade); in 3D the world rotates ±120° around the (1,1,1) diagonal axis (the camera does not move). The active player's board border is highlighted and labeled "(you)". In the L layout, the active player sits at the bottom of the screen, with the remaining two players above the active player and above-right of them; when this is later developed into an online system, no rotation is needed — the active player's board simply always sits at the bottom of the screen.
2. 3D version: left-drag to orbit the view, mouse wheel to zoom; 2D version: no orbiting needed, switch between the two layouts at any time.
3. Click one of your own pieces to select it; **cyan highlights mark legal destinations, magenta marks cross-plane destinations**.
4. Click a destination to complete the move; illegal moves are intercepted automatically.
5. **Top-left** info panel: current turn, hints, reset game, mode/view switching; top-right legend; bottom-left live game log; end-of-game banner with "Play Again".

![3D view](<docs/3D.png>) (The colors in this image are wrong; replace with a new screenshot after development.)

### 7.5 Implementation Notes
- River-crossing mechanism: Rook/Cannon/Pawn slide along their current grid line to the inner-edge axis, then cross via the dashed arc onto the adjacent board's corresponding line and continue straight (`lineStep` handles the river-crossing redirection: after crossing, the piece continues on the opposite board in the "away from river" direction). This mechanism is the **precise rule**, not a visual simplification.
- The Horse's 3D knight move is implemented per the "arc-unfolded knight" convention (§3.4), geometrically consistent with the Rook/Cannon continuous channel.
- **2D-1 star layout**: each board maps to a **45° square (affine straight grid)** arranged around the hub — radial distance `R0+(col+rank)·DR` (smaller `col+rank` = closer to the hub), lateral offset `±(col−rank)·DR` (the blue board is mirrored to `r−c`, so the inner-edge arms face the adjacent boards directly, consistent with the `lineStep` pairing). Each board is a 45°-rotated square with congruent cells; **front lines (`col+rank` isolines) are parallel straight segments**, and col/rank grid lines form two families of parallel diagonals; the King's corner (7,7) faces outward and the (0,0) corner hugs the hub. The three boards are arranged 120° apart around the hub, and the gaps between them are the three axis-river channels; river-crossing connectors are drawn per the `lineStep` pairing: when the two lines are parallel a straight dashed line is drawn, otherwise a quadratic Bézier curve is drawn with its control point at the intersection of the two boards' channel-line tangent extensions (tangent to the board lines at both ends). Turn changes rotate the whole layout ±120° (0.55s easing).
![2D mode, star view](<docs/2D-star layout.png>)

- **2D-2 L-shaped view**: three square boards rigidly combined, with fixed slots — bottom (active player) / right (next player) / top (previous player); each board's (0,0) corner faces the hub; river connectors are drawn automatically per the `lineStep` pairing — parallel facing edges get straight dashed lines, and corners get Bézier arcs (control point at the L corner nearer the hub).
- The 3D version's turn rotation exploits the geometric fact that the three boards are 120°-symmetric around the (1,1,1) diagonal axis (XY→XZ→YZ slot rotation); rotating the `world` group brings the active player's board to the floor position (bottom of the screen) while the camera stays fixed.
- Three players take turns operating the same device (Pass-and-Play).
![2D mode, rectangular view](<docs/2D-L layout.png>)
---

## 8. Open Questions
1. **Third-player tempo compensation**: in a three-player rotation, the third player acts two full turns later each round, which is inherently disadvantaged; a compensation mechanism is needed (e.g., an extra move in the first round, action points, etc.). **Not implemented.**
