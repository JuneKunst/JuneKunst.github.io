# 문제 풀이 흐름 — mission_manager · mission_solver · planner (11-09 develop)

> develop `a6e5072` 코드 기준 (`plan/src/mission_manager.cpp` · `plan/src/mission_solver.cpp` · `plan/config/plan.yaml`).
> 관련: [지금 구조 — 노드 · 플러그인](system-now.html) · [skill 노드 구성](skill-nodes.html) · [할 일 · 진행](work-plan.html) · 발제: `documents/mission/README.md`

---

## 0. 누가 무엇을 정하나

```mermaid
flowchart LR
  P["인지<br/>신호 · 바코드 · 퍽 tag·색·모양"]:::in --> MM
  subgraph MM["mission_manager — 단계 진행 · 기록"]
    MS["mission_solver<br/>(하드코딩 규칙 · 순수 함수)<br/>판정 · 배정 · 할당 · 칸 · 재검증"]:::rule
    PL{{"BUILD 순서<br/>planner: rule (기본) · plan_next"}}:::plan
  end
  MM -->|"/task/sub_goals"| CO["coordinator<br/>검증 · 순서 · 적재함 장부"]:::node
  CO -->|"🎬 /skills/*"| SK["skill 노드 9개<br/>navigate · approach · pose · inspect<br/>pick · place · load · unload · stand"]:::node
  SK -->|"성공 · 실패 이유"| CO -->|"/task/status"| MM
  classDef in fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef rule fill:#3d3112,stroke:#e2a83a,color:#e8eef8
  classDef plan fill:#2b2340,stroke:#b48cf0,color:#e8eef8
  classDef node fill:#1d3a5c,stroke:#67b7e8,color:#e8eef8
```

- **"무엇을 어디에"** (배정 · 할당 · 칸)는 언제나 **mission_solver 규칙**이 정합니다.
- **planner**는 그 결과를 받아 **BUILD 단계의 순서만** 정합니다 — `rule`(기본, 하드코딩) 또는 `plan_next`(학습 정책).

---

## 1. 미션 단계 전체 (`next_phase`)

```mermaid
flowchart TD
  IDLE(["IDLE<br/>/cmd/mission start 대기"]) -->|start| GO["GO_OBSERVE<br/>팔 scan 자세 · 바코드 보는 자리로"]
  GO -->|ok| BC["BARCODE<br/>이번에 본 바코드만"]
  BC -->|ok| RD["READ<br/>12회 점멸 관측"]
  RD -->|"확정 · 유효"| SV["SURVEY<br/>시작 박스 6곳 조사 · 적재함에 싣기"]
  SV -->|"할당 성공"| BD["BUILD<br/>퍽마다 장소 칸에 놓기"]
  SV -->|"할당 실패"| RT
  BD --> VF["VERIFY<br/>장소마다 새로 본 퍽으로 판정"]
  VF --> RT["RETURN<br/>출발 구역 · 3초 정지"]
  RT -->|ok| DONE(["DONE"])
  GO -->|실패| ERR(["ERROR<br/>안전 정지"])
  BC -->|"못 읽음 · 미등록"| ERR
  RD -->|"오류 사이클 2번 · 150 s"| ERR
  RT -->|"이동 실패"| ERR
  classDef err fill:#4a1d1d,stroke:#e06666,color:#e8eef8
  class ERR err
```

**실패 원칙:** skill은 `retries: 2`번 다시 시도 → 그래도 안 되면 **그 퍽 · 장소만 실패로 기록하고 다음으로**(복귀까지 감).
멈추는 것(ERROR)은 **관측(신호·바코드) 오류와 복귀 이동 실패**뿐 — 발제 "추정 금지 → 오류 기록 · 안전 정지".

---

## 2. 관측 → 정답 계산 (mission_solver)

```mermaid
flowchart TD
  S1["signal_decoder 사이클 결과<br/>/mission/signal_status"] --> SA{"signal_action"}
  SA -->|"두 사이클 같은 답"| ACC["확정: 12개 색 순서 · R·Y·G 횟수"]
  SA -->|"아직 한 사이클"| WAIT["기다림"] --> S1
  SA -->|"개수·모르는 색·범위 오류<br/>2번 이어짐"| E1(["ERROR"])
  ACC --> VC{"valid_counts<br/>각 1~6 · 합 12"}
  VC -->|아님| E1
  VC -->|맞음| PB{"parse_barcode"}
  BCD["바코드 원문 /mission/qr"] --> PB
  PB -->|"P2-01 · P2-03"| ASC["오름차순"]
  PB -->|"P2-02 · P2-04"| DSC["내림차순"]
  PB -->|"그 밖"| E1
  ASC & DSC --> AL["assign_locations<br/>R·Y·G를 횟수로 정렬 → L1 · L2 · L3<br/>(같으면 R → Y → G 순서 유지) · 예: YRG"]
  AL --> SUR["SURVEY에서 퍽 12개 tag·색·모양"] --> ALC["allocate (아래 3절)"]
  ALC --> DC["dice_cells(횟수) → 칸 번호<br/>cell_offset → 장소 중심 ±60 mm"]
  DC --> JOBS["할 일 목록: 퍽(tag) → 장소 · 칸"]
  classDef err fill:#4a1d1d,stroke:#e06666,color:#e8eef8
  class E1 err
```

**주사위 칸 (`dice_cells`, 3×3, 4 = 가운데) — 가운데 먼저** (이웃이 놓인 뒤엔 가운데 성공률이 81~83 %로 떨어짐)

| 눈 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 칸 순서 | 4 | 0 · 8 | 4 · 0 · 8 | 0 · 2 · 6 · 8 | 4 · 0 · 2 · 6 · 8 | 0 · 3 · 6 · 2 · 5 · 8 |

---

## 3. 할당 (`allocate`) — 퍽 12개를 R · Y · G에

```mermaid
flowchart TD
  A0["퍽 12개 (tag · 색 · 모양) + 횟수 R·Y·G"] --> A1{"12개? · tag 중복 없음?<br/>색 red/green · 모양 cyl/box?"}
  A1 -->|아님| F(["실패: puck_count · duplicate_tag · unknown_puck<br/>(추정 안 함)"])
  A1 -->|맞음| A2["Y로 가야 할 수<br/>y_red = 빨강 수 − R · y_green = 초록 수 − G"]
  A2 --> A3{"y_red ≥ 0 · y_green ≥ 0<br/>y_red + y_green = Y ?"}
  A3 -->|아님| F2(["실패: no_allocation"])
  A3 -->|맞음| A4{"원기둥으로 Y를 채울 수 있나?<br/>(빨강 원기둥 ≥ y_red · 초록 원기둥 ≥ y_green)"}
  A4 -->|예| A6["원기둥 퍽부터 Y로 · 나머지는 색대로 R / G"]
  A4 -->|아니오| A5{"직육면체로는?"}
  A5 -->|예| A7["직육면체 퍽부터 Y로 · 나머지는 색대로"]
  A5 -->|아니오| F2
  A6 & A7 --> OK(["tag → R · Y · G"])
  classDef err fill:#4a1d1d,stroke:#e06666,color:#e8eef8
  class F,F2 err
```

발제 규칙: **R = 빨간 퍽만 · G = 초록 퍽만 · Y = 색은 섞여도 되지만 모양은 하나로 통일**. 남는 빨강 · 초록이 Y가 되고, Y가 한 모양으로 모이는 쪽을 고릅니다.

---

## 4. SURVEY — 시작 박스 6곳

```mermaid
flowchart TD
  B0["박스 b (1 → 6 차례로)"] --> G1["go_near: navigate (변 바깥 0.25 m) → approach dock_box (변에서 8.5 cm)"]
  G1 -->|실패| NX["기록 · 다음 박스"]
  G1 --> I1["inspect 퍽 두 자리 (박스 중심 x ± 40 mm)"]
  I1 --> R1["자리마다 match_radius 4 cm 안 · tag 읽은 퍽 → tag · 색 · 모양 · 누움 기억 (#79)"]
  R1 --> L0{"적재함에 빈 칸?"}
  L0 -->|없음| NX
  L0 -->|있음| GR["grab(tag): 집기 직전에 트랙 다시 찾기<br/>누웠으면 stand → stand_pick · 아니면 pick"]
  GR -->|실패| NX2["기록 (BUILD 때 박스에서 직접)"]
  GR --> LD["load next — 칸은 coordinator가 고르고 장부에 tag"]
  LD -->|실패| BK["박스 제자리에 place로 되돌림"]
  LD & BK & NX2 --> MORE{"이 박스에 퍽 더?"}
  MORE -->|예| L0
  MORE -->|아니오| NX
  NX --> END{"6곳 다?"} -->|아니오| B0
  END -->|예| ALC["allocate → 할 일 목록 (2·3절)"]
```

---

## 5. BUILD — 순서 정하기 (planner) + 퍽 하나 처리

```mermaid
flowchart TD
  P0{"planner (plan.yaml)"} -->|"rule (기본)"| R0["L1 → L2 → L3 · 장소 안은 dice_cells 순서 (가운데 먼저)<br/>칸 ↔ 퍽은 tag 번호 순서로 짝<br/>이동 거리 · 성공 확률은 안 따짐"]
  P0 -->|"plan_next"| N0["학습 정책이 다음 행동 하나를 고름<br/>(6절) · 퍽 하나 처리 결과로 상태를 고쳐 다시 고름"]
  R0 & N0 --> J["다음 퍽 (tag → 장소 L · 칸 c)"]
  J --> W{"적재함에 있나?<br/>(/coordinator/basket 장부)"}
  W -->|있음| GL["장소 앞으로 go_near → 장소 태그로 칸 보정 (최대 5 cm)"] --> UN["unload &lt;칸&gt;"]
  W -->|없음| GB["시작 박스로 → grab(tag)"] --> GL2["장소 앞으로 go_near → 칸 보정"]
  UN & GL2 --> PLC["place 칸 x,y,z"]
  PLC --> CK["내려다보기 (inspect)"]
  CK --> OKQ{"칸 중심 10 mm 안 · 서 있음?"}
  OKQ -->|예| DONE1["성공 기록"]
  OKQ -->|"벗어남 · 쓰러짐"| RE["다시 집어 놓기 (retries번)"] --> PLC
  RE -->|"계속 실패"| FAIL1["그 퍽 실패 기록"]
  DONE1 & FAIL1 --> NEXT{"남은 퍽?"} -->|예| P0
  NEXT -->|아니오| VF(["VERIFY"])
```

---

## 6. plan_next — 학습된 순서 정하기

| 항목 | 내용 |
|---|---|
| 맡는 범위 | **BUILD 순서만** — 다음에 어느 퍽에 무엇을 할지 · 언제 포기하고 복귀할지 |
| 입력 (167) | 퍽 12개마다 상태(박스에 섬 · 누움 · 손 · 적재함 · 칸 맞음 · 어긋남 · 칸에 누움 · 잃음) · 목표 장소 · 가운데 칸 · 시도 횟수 + 로봇 위치 10곳 + 지난 시간 |
| 출력 (97) | `퍽 i × {집기 · 세우기 · 싣기 · 꺼내기 · 놓기 · 밀어 맞추기 · 다시 집기 · 칸에서 세우기}` + `복귀`. 시작 조건 안 맞는 행동 · **로봇에 없는 skill(밀어 맞추기 · 칸에서 세우기)은 막음** |
| 학습 | 가상 미션(`learning/plan/mission_sim.py`, 물리 없이 skill 성공을 확률로) · 보상 = 채점표(장소 주사위 +10 · 복귀 +10 · 시간 벌점) · 규칙 따라 하기 → MaskablePPO |
| 로봇 | `planner: "plan_next"`로 켬 (**지금 기본은 `rule`**) · 정책 파일 `models/plan/plan_next.onnx` (PR #97 · `plan_model`에 `.policy` 경로를 주면 기존 계산) · 못 읽으면 rule로 |
| 상태 | skill 성공률이 **임시값으로 학습됨** → 측정값으로 다시 학습 필요. 가상 미션에서 최단 순서 계산기도 38.11 / 40 — **점수는 순서보다 skill 성공률이 좌우** |

**rule과의 차이:** rule은 "L1부터 고정 순서 · 실패하면 2번 다시 후 포기". plan_next는 확률을 보고 "다시 시도할지 · 다른 장소를 먼저 할지 · 시간이 없으면 복귀할지"를 고름.

---

## 7. VERIFY · RETURN

```mermaid
flowchart LR
  V0["장소 L1 · L2 · L3"] --> V1["장소 앞 → inspect (사진)"] --> V2["judge_location<br/>중심 15 cm 안 · 새로 본 퍽만<br/>칸별 10 mm 판정"]
  V2 --> V3["global_check<br/>12개 tag 중복 · 누락"] --> V4["verify.json (재검증 8점)"]
  V4 --> R1["pose stow → navigate 출발 구역 가운데 → approach park_home"] --> R2{"footprint_in_zone<br/>차체 네 모서리가 구역 안?"}
  R2 -->|예| R3["3초 정지 → DONE"]
  R2 -->|아니오| R4["보정 이동"] --> R2
```

---

## 8. skill별 결과 (`/skills/<skill>` — 결과 = 성공 여부 + 이유)

| skill | 하는 일 | 성공하면 | 대표 실패 이유 |
|---|---|---|---|
| `navigate` | Nav2 먼 이동 | 목표 근처 | `nav_failed` |
| `approach` | 마지막 몇 cm (돌기-직진-돌기 + 도킹 정책) | 도킹 자리 (1 cm · 1.5°) | `approach_blocked` · `approach_no_tf` · `approach_bad_policy` |
| `pose` | 이름 붙은 팔 자세 (stow · scan · carry) | 그 자세 | `pose_unknown` |
| `inspect` | 점 위에서 내려다보기 | 인지 트랙에 tag · 색 · 모양 | `inspect_failed` · `inspect_partial` · `inspect_no_look_pose` |
| `pick` | 파지 후보 → 내려가 쥐기 → 들기 (닿는 구간 정책 보정) | 퍽이 손에 | `no_grasp` · `pick_no_target` · `grasp_empty` · `arm_contact` |
| `stand` · `stand_pick` | 누운 퍽 세우기 → 그 자리에서 쥐기 | 선 퍽이 손에 | `stand_no_tf` · `stand_pick_no_stand` (미션: `stand_still_lying`) |
| `load` | 손의 퍽 → 적재함 칸 | **장부에 칸 → tag** | `basket_table_missing` · 칸 꽉 참 |
| `unload` | 적재함 칸 → 손 | 퍽이 손에 · 장부에서 지움 | `basket_table_missing` |
| `place` | 손의 퍽 → 칸 좌표 | 퍽이 칸에 | `place_bad_target` |

---

## 9. mission_solver 함수 한눈에

| 함수 | 규칙 |
|---|---|
| `signal_action` | 두 사이클 같은 답이면 확정 · 오류 사이클 2번이면 정지 |
| `valid_counts` | R·Y·G 각 1~6 · 합 12 |
| `parse_barcode` | `P2-01`·`P2-03` 오름 · `P2-02`·`P2-04` 내림 · 그 밖 미등록 |
| `assign_locations` | 횟수 정렬 → L1·L2·L3 (같으면 R→Y→G) |
| `group_count` | 그룹 → 횟수 |
| `allocate` | 3절 |
| `dice_cells` · `cell_offset` | 눈 → 칸 (가운데 먼저) · 칸 → ±60 mm |
| `arena_to_map` | 경기장 좌표 → 지도 (출발 자세 기준) |
| `approach_poses` | 박스 변 바깥 standoff 자리 후보 |
| `tag_correction` | 장소 태그로 칸 보정 (최대 5 cm) |
| `judge_location` · `global_check` | 재검증 칸 판정 · 중복·누락 |
| `footprint_in_zone` | 복귀 판정 |
| `next_phase` | 단계 전이 (1절) |
