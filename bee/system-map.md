# BEE 전체 지도 — 학습부터 로봇까지

> **2026-11-03 17:50 기준** (pa27 시각). 지금까지 만든 것 전부를 한 장에 그렸습니다. 색: <b style="color:#3fbf7f">초록 = 완료</b> · <b style="color:#67b7e8">파랑 = 코드 완료, 실기 시험 전</b> · <b style="color:#e2a83a">노랑 = 진행 중 · 일부</b> · <b style="color:#e06666">빨강 = 아직 없음</b> · <b style="color:#8aa0b8">회색 = 학습 안 함 (규칙·기존 그대로)</b>
> 자세한 내용: [학습용 skill 구성](skill-learning.html) · [skill별 학습 조건](skill-training.html) · [스킬·플랜 한 장](skill-plan.html)
> PR: [#53 skill 목록·플래너 학습](https://github.com/visualkhh/Lv2_bee_Assignment/pull/53) · [#54 hand_relative](https://github.com/visualkhh/Lv2_bee_Assignment/pull/54) · [#55 로봇 배포](https://github.com/visualkhh/Lv2_bee_Assignment/pull/55) · [#56 Isaac 학습 환경](https://github.com/visualkhh/Lv2_bee_Assignment/pull/56) · (먼저) [#49 미션 흐름](https://github.com/visualkhh/Lv2_bee_Assignment/pull/49)

---

## 1. 한눈에 — 네 덩어리

```mermaid
flowchart LR
  subgraph g1_SIM["① 시뮬에서 학습 (Isaac Lab · pa27)"]
    g1_E["skill별 학습 환경<br/>팔 9 · 주행 5"]:::ok --> g1_Q["학습 대기열<br/>8개 중 3개 끝 · 진행 중"]:::wip
    g1_MS["가상 미션<br/>(플래너 학습)"]:::ok
  end
  subgraph g1_OUT["② 결과물"]
    g1_P["skill 정책 파일 .policy<br/>4개 사용 가능 · 나머지 학습 중"]:::wip
    g1_PN["플래너 plan_next"]:::ok
  end
  subgraph g1_CHECK["③ 시뮬에서 미션 전체 풀기"]
    g1_MR["무작위 출제 → 계산기 → 플래너 → skill<br/>첫 완주 20점 · 10점"]:::wip
  end
  subgraph g1_ROBOT["④ 실제 로봇 (ROS 2)"]
    g1_R["배포 코드 완료 (PR #55)<br/>보정 컨트롤러 · 닿는 구간 · 도킹 · plan_next"]:::code
  end
  g1_Q --> g1_P
  g1_MS --> g1_PN
  g1_P --> g1_MR
  g1_PN --> g1_MR
  g1_P -->|"export_policy.py → model/"| g1_R
  g1_PN -->|"planner: plan_next"| g1_R
  classDef ok fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef code fill:#1d3a5c,stroke:#67b7e8,color:#e8eef8
  classDef wip fill:#3d3112,stroke:#e2a83a,color:#e8eef8
  classDef no fill:#3d1616,stroke:#e06666,color:#e8eef8
  classDef keep fill:#1c2635,stroke:#8aa0b8,color:#e8eef8
```

| 덩어리 | 지금 | 막힌 곳 |
|---|---|---|
| ① 시뮬 학습 | 환경 14개 완성 · 대기열 8개 중 **3개 끝** (`dock_box` 98.6 %, `drive_straight` 100 %, `load_slot` 98.3 %) · 지금 `unload_slot` | 남은 5개 — skill당 약 30~45분 (2048 env × 500회) |
| ② 결과물 | 로봇에 넣은 정책 **5개** (`place_cell`·`pick_upright` 팀원 · `dock_box` · `drive_straight` · `load_slot`) + 플래너 1개 | 학습 중 5개는 끝나면 넣기 |
| ③ 시뮬 미션 | 무작위 문제를 끝까지 풂 (문제 #1 20점, #7 10점) | 점수를 깎는 건 **skill 실패** (집다 떨어뜨림 · 놓다 누움) |
| ④ 로봇 | **배포 코드 완료** — pa27 ROS에서 빌드 · 테스트 61개 통과 (PR #55) | **실기 · 전체 bringup 시험 전** · PR #49 → #54 → #55 병합 |

---

## 2. 미션은 어떻게 풀리나 — 계산기 · 플래너 · task · skill

```mermaid
flowchart TB
  g2_IN["인식 결과<br/>신호 R·Y·G · 바코드 · 퍽 12개 색·모양·번호·위치"]:::ok
  g2_CALC["계산기 mission_solver<br/>퍽마다 목표 (장소 L1~L3, 칸 0~8)<br/>규칙 = 정답 하나"]:::ok
  g2_PLAN["플래너<br/>rule (배정 순서) | plan_next (학습)<br/>다음 퍽·복귀 시점"]:::code
  g2_T["task 6개<br/>관측 → 조사 → 수집 → 배치 → 검증 → 복귀"]:::ok
  g2_SK["skill 37개 (아래 4장)"]:::wip
  g2_RES["skill 결과<br/>손 · 적재함 · 칸 맞음/어긋남/누움 · 잃음"]
  g2_IN --> g2_CALC --> g2_PLAN --> g2_T --> g2_SK --> g2_RES --> g2_PLAN
  classDef ok fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef code fill:#1d3a5c,stroke:#67b7e8,color:#e8eef8
  classDef wip fill:#3d3112,stroke:#e2a83a,color:#e8eef8
```

| 부분 | 시뮬 (Isaac) | 로봇 (ROS) |
|---|---|---|
| 계산기 | ✅ `mission_rules.py` (C++와 같은 규칙) | 🟡 `mission_solver` — PR #49 열림 |
| 플래너 | ✅ `plan_next` 학습 · 미션 실행기에서 사용 | 🔵 C++ `plan_next` + mission_manager `planner` 파라미터 (기본 `rule`) — PR #55 · Python과 40개 상태 모두 같은 행동 |
| task 흐름 | ✅ 미션 실행기 | 🟡 `mission_manager` — PR #49 열림 |

---

## 3. 로봇에서 한 skill이 움직이는 길 (2026-11-03 배포 결정)

```mermaid
flowchart LR
  g3_MM["mission_manager<br/>(PR #49 · planner #55)"]:::wip -->|"다음 skill"| g3_CO["coordinator<br/>skill 실행 (#55)"]:::code
  g3_CO -->|"① 빈 공간 이동"| g3_MV["MoveIt<br/>stow → 퍽 위 5 cm"]:::ok
  g3_CO -->|"② 닿는 구간<br/>(시뮬과 같은 IK + 보간)"| g3_IK["IK 궤적<br/>내려가기 → 쥐기·놓기 → 올리기"]:::code
  g3_MV --> g3_JTC["arm_controller<br/>(JTC)"]:::ok
  g3_IK --> g3_JTC
  g3_JTC --> g3_RC["rl_arm_correction<br/>처짐 적분 + 정책 Δ"]:::code
  g3_RC --> g3_HW["팔 하드웨어"]:::ok
  g3_CAM["손 카메라 검출<br/>perception"]:::ok --> g3_HR["hand_relative<br/>퍽 − 손 · 칸 − 퍽 (#54)"]:::code
  g3_CO -->|"/hand_relative/target"| g3_HR
  g3_CO -->|"/skill_context"| g3_RC
  g3_HR -->|"/hand_relative"| g3_RC
  g3_CO -->|"먼 길"| g3_NAV["Nav2"]:::ok
  g3_CO -->|"상자 앞 도킹<br/>(시뮬과 같은 P 제어)"| g3_AP["approach"]:::code
  g3_NAV --> g3_NC["rl_nav_correction<br/>도킹 모드"]:::code
  g3_AP --> g3_NC
  g3_CO -->|"/skill_context"| g3_NC
  g3_NC --> g3_BASE["바퀴"]:::ok
  classDef ok fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef code fill:#1d3a5c,stroke:#67b7e8,color:#e8eef8
  classDef wip fill:#3d3112,stroke:#e2a83a,color:#e8eef8
```

| 칸 | 상태 | 남은 것 |
|---|---|---|
| MoveIt · JTC · Nav2 · 하드웨어 | ✅ 있음 | — |
| `hand_relative` (손 카메라 상대값) | 🔵 PR #54 · 노드 시험 통과 | 실기 |
| coordinator → `/hand_relative/target` · `/skill_context` | 🔵 PR #55 | 실기 |
| coordinator 닿는 구간 = 시뮬과 같은 IK 궤적 (`contact_mode: sim`) | 🔵 PR #55 · 집기 · 놓기 · 싣기 · 꺼내기 | 실기 · 세우기는 아직 예전 방식 |
| approach 도킹 = 시뮬과 같은 P 제어 (`approach_mode: sim`) | 🔵 PR #55 | 실기 |
| `rl_arm_correction` (정책 계산 · 처짐 적분) | 🔵 PR #55 · C++ = TorchScript 검산 | 실기 (컨트롤러 체인에서 불러오기 · 주기) |
| `rl_nav_correction` 도킹 모드 | 🔵 PR #55 | 실기 |
| mission_manager · mission_solver | 🟡 PR #49 | 병합 |

---

## 3-1. 예시: "배치" task 하나가 하드웨어까지 가는 길 — 학습된 모델은 어디서 도나

**상황**: 플래너가 "퍽 7번(적재함 칸 5에 있음)을 L1 상자의 가운데 칸(4번)에 놓기"를 골랐습니다. 이 task는 skill 4개로 풀립니다.

```mermaid
flowchart TB
  subgraph gx_MM["mission_manager (skill 하나 끝날 때마다)"]
    gx_PN["🧠 plan_next.policy<br/>다음 skill 고르기"]:::model
  end
  gx_PN -->|"① navigate → ② dock_box → ③ unload_slot → ④ place_cell"| gx_CO["coordinator<br/>skill 하나씩 실행 · 단계 관리"]
  subgraph gx_BASE_PATH["주행 (①②)"]
    gx_NAV["Nav2<br/>① L1 앞까지"] --> gx_NC
    gx_AP["approach<br/>② 돌기-직진-돌기 P 제어"] --> gx_NC["rl_nav_correction 노드<br/>🧠 dock_box.policy<br/>속도 명령 + Δv·Δw"]:::model
    gx_NC --> gx_VS["velocity_smoother"] --> gx_OC["OpenCR → 바퀴 모터"]
  end
  subgraph gx_ARM_PATH["팔 (③④)"]
    gx_MV["MoveIt<br/>빈 공간: stow → carry → 칸 위"] --> gx_JTC
    gx_IK["IK 궤적<br/>닿는 구간: 내려가기 → 쥐기/놓기 → 올리기"] --> gx_JTC["arm_controller (JTC)<br/>목표 관절각"]
    gx_JTC --> gx_RC["rl_arm_correction 컨트롤러 (100Hz, controller_manager 안)<br/>🧠 unload_slot.policy · place_cell.policy<br/>목표 관절각 + 처짐 적분 + Δ (±0.05 rad)"]:::model
    gx_RC --> gx_DX["OpenCR → 팔 모터 XM430"]
  end
  gx_CO --> gx_NAV
  gx_CO --> gx_AP
  gx_CO --> gx_MV
  gx_CO --> gx_IK
  gx_CO -->|"/skill_context<br/>지금 skill·단계·목표"| gx_RC
  gx_CO -->|"/hand_relative/target<br/>무엇을 잴지"| gx_HR["hand_relative<br/>손 카메라 상대값"]
  gx_CAM["perception (≤4Hz)<br/>🧠 YOLO bee_yolo11n_v3<br/>+ AprilTag"]:::model --> gx_HR
  gx_HR -->|"/hand_relative<br/>퍽 − 손 · 칸 − 퍽"| gx_RC
  classDef model fill:#2a1f4d,stroke:#a78bfa,color:#e8eef8
```
<b style="color:#a78bfa">🧠 보라 = 학습된 모델이 도는 곳</b>

| 순서 | skill | 누가 움직이나 | 🧠 학습된 모델 (어디서 · 무엇을) | 끝 판정 |
|---|---|---|---|---|
| 0 | (고르기) | mission_manager | **`plan_next`** — mission_manager 안 (`planner: plan_next`일 때). skill이 하나 끝날 때마다 "다음 퍽 + 복귀할지" | — |
| ① | `navigate` | Nav2 | 없음 (Nav2 그대로) | L1 앞 도착 |
| ② | `dock_box` | coordinator approach (돌기-직진-돌기) | **`dock_box`** — `rl_nav_correction`. approach 속도 명령에 작은 Δv·Δw | 상자 앞 1 cm · 1.5° 안 0.5 s 정지 |
| ③ | `unload_slot` | [1] MoveIt: stow → carry → 칸 5 위 · [2] IK 궤적: 내려가기 → 쥐기 → 칸 위 | **`unload_slot`** — `rl_arm_correction`. [2] 구간만. 입력: 관절 상태 + 단계 + `/hand_relative`(퍽 − 손) | 퍽이 손 안 (전류 + 손가락 위치) |
| ④ | `place_cell` | [1] MoveIt: carry → 칸 4 위 5 cm · [2] IK 궤적: 내려가기 → 벌리기 → 올리기 | **`place_cell`** — 같은 `rl_arm_correction`. 입력에 `/hand_relative`(칸 − 손 안 퍽) | `judge_cell` (규칙): 칸 중심 10 mm 안 |
| → | (다음) | mission_manager | **`plan_next`** 다시 | — |

**정리 — 모델은 4곳에서만 돕니다**

| 모델 | 도는 곳 | 얼마나 자주 | 하는 일 | 없으면 |
|---|---|---|---|---|
| `plan_next` | mission_manager (노드) | skill 하나 끝날 때 1번 | 다음 퍽·복귀 시점 | 규칙 순서 |
| `dock_box` 등 주행 정책 | rl_nav_correction (노드) | approach 명령마다 (20Hz) | 속도 명령에 작은 보정 | 보정 0 — 기준 P 제어만 |
| `place_cell` 등 팔 정책 | rl_arm_correction (ros2_control 컨트롤러, JTC 바로 뒤) | 100Hz 루프, 정책은 50Hz | 목표 관절각에 작은 보정 (닿는 구간만) | 보정 0 — 기준 궤적만 |
| YOLO | perception (노드) | 카메라당 ≤ 4Hz | 퍽·신호등 찾기 | — |

- 학습된 skill 정책은 **로봇을 처음부터 움직이지 않습니다.** 늘 기준 동작(Nav2 · MoveIt · IK 궤적 · P 제어)이 움직이고, 정책은 그 위에 몇 mm·몇 cm/s만 고칩니다. 정책을 끄면(Δ = 0) 지금 로봇과 똑같이 움직입니다.
- 팔 정책 파일은 skill마다 하나씩이고, **coordinator가 `/skill_context`로 "지금 어떤 skill의 어느 단계인지" 알려 주면 `rl_arm_correction`이 그 skill의 정책만 켭니다.**
- 정책 계산은 ONNX 런타임 없이 C++로 직접 (`ml/mlp_policy.hpp`) — Jetson에 따로 설치할 것 없음. 정책 파일은 `.policy` (TorchScript에서 `export_policy.py`로 변환, 검산값 포함).

---

## 3-2. 최종 목표 — skill별로 무엇이 움직이고, 학습 모델은 어디서 도나

> 학습 결과(지금은 1차)가 모두 기준선보다 좋아졌다고 볼 때의 최종 그림입니다. 기준선을 못 넘는 skill은 그 정책 파일을 넣지 않으면 기준 동작으로 돕니다 (Δ = 0).

**한 문장**: "퍽에 닿는 구간과 상자 앞 짧은 도킹·이동"에만 학습 보정이 붙고, 나머지는 지금 로봇 방식(MoveIt · Nav2 · YOLO · 규칙) 그대로 — 그 위에서 플래너 하나가 다음 skill을 고릅니다.

```mermaid
flowchart LR
  subgraph gy_MODEL["🧠 학습 모델을 쓰는 skill 14개"]
    direction TB
    gy_ma["팔 · 닿는 구간 (IK 궤적 + 보정)<br/>pick_upright · stand_up · regrasp_stood<br/>load_slot · unload_slot · place_cell<br/>nudge_cell · stand_in_place"]:::model
    gy_mb["팔 · 끝 자세 (MoveIt + 처짐 보정)<br/>pregrasp"]:::model
    gy_mc["주행 · 짧은 이동 (approach P 제어 + 보정)<br/>dock_box · park_home · drive_straight · drive_arc"]:::model
    gy_md["플랜<br/>plan_next"]:::model
  end
  subgraph gy_KEEP["기존 방식 그대로 23개"]
    direction TB
    gy_ka["팔: move_pose · camera_clear_view · camera_look_down (MoveIt)<br/>compensate_sag · grip_force (실측값)"]:::keep
    gy_kb["주행: drive_turn (P 제어) · navigate (Nav2)"]:::keep
    gy_kc["인식: YOLO 3 · 규칙 4"]:::keep
    gy_kd["상태·비상 6 · 맵 3"]:::keep
  end
  gy_ma --> gy_N1["rl_arm_correction<br/>(JTC 뒤 · 모터 앞)"]:::node
  gy_mb --> gy_N1
  gy_mc --> gy_N2["rl_nav_correction"]:::node
  gy_md --> gy_N3["mission_manager"]:::node
  classDef model fill:#2a1f4d,stroke:#a78bfa,color:#e8eef8
  classDef keep fill:#1c2635,stroke:#8aa0b8,color:#e8eef8
  classDef node fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
```

| 영역 | skill (학습 모델 씀) | 기준 동작 | 학습 보정이 도는 곳 | 로봇 연결 |
|---|---|---|---|---|
| 팔 · 닿는 구간 | `place_cell` · `load_slot` · `pick_upright` · `unload_slot` | IK 궤적 (시뮬과 같음) | `rl_arm_correction` | 🔵 연결됨 (#55) |
| 팔 · 닿는 구간 | `stand_up` · `regrasp_stood` | 원호 경유점 | `rl_arm_correction` | 🔴 입력 모양 추가 필요 |
| 팔 · 닿는 구간 | `nudge_cell`* · `stand_in_place`* | — | — | 🔴 환경 없음 |
| 팔 · 끝 자세 | `pregrasp` | MoveIt 경로 | `rl_arm_correction` | 🔴 입력 모양 추가 필요 |
| 주행 · 짧은 이동 | `dock_box` · `park_home` · `drive_straight` · `drive_arc` | approach P 제어 | `rl_nav_correction` | 🔵 연결됨 (#55) |
| 플랜 | `plan_next` | (규칙 순서 대신) | `mission_manager` | 🔵 연결됨 (#55) |

\* 아직 학습 환경 없음

<details>
<summary>▶ 학습 모델 없이 기존 방식 그대로 — 23개</summary>

| 영역 | skill | 무엇으로 |
|---|---|---|
| 팔 | `move_pose` · `camera_clear_view` · `camera_look_down` | MoveIt (기준선이 이미 정확) |
| 팔 | `compensate_sag` · `grip_force` | 실측값 (보정표) |
| 주행 | `drive_turn` | P 제어 (기준선이 이미 정확) |
| 주행 | `navigate` | Nav2 |
| 인식 | `detect_puck` · `classify_color` · `classify_shape_pose` | YOLO (이미 학습된 `.pt`, perception 노드) |
| 인식 | `read_puck_tag` · `detect_location_box` · `read_signal_barcode` · `judge_cell` | 규칙 (AprilTag · 바코드 · 거리 계산) |
| 상태·비상 | `monitor_battery` · `monitor_current` · `monitor_motor` · `detect_tip_impact` · `basket_ledger` · `estop` | 문턱값 · 장부 · 버튼 |
| 맵 | `slam_localize` · `build_map` · `align_arena` | cuVSLAM · nvblox |

</details>

---

## 3-3. 노드 현황 — 무엇이 끝났고 무엇이 남았나

```mermaid
flowchart TB
  subgraph gz_DONE["✅ 원래 있음"]
    direction LR
    gz_d1["perception · signal_decoder · body_filter"]:::ok
    gz_d3["MoveIt · JTC · 그리퍼 · OpenCR · Nav2"]:::ok
    gz_d5["cuVSLAM · nvblox · state_manager"]:::ok
  end
  subgraph gz_CODE["🔵 오늘 만듦 — 코드 완료 · 실기 시험 전"]
    direction LR
    gz_d6["hand_relative (#54)"]:::code
    gz_d7["SkillContext /skill_context"]:::code
    gz_d8["coordinator 닿는 구간 · approach"]:::code
    gz_d10["rl_arm_correction 정책 · 처짐 적분"]:::code
    gz_d11["rl_nav_correction 도킹 모드"]:::code
    gz_d12["plan_next · planner 파라미터"]:::code
    gz_d13["정책 파일 5개 + 플래너"]:::code
  end
  subgraph gz_LEFT["🔴 남은 것"]
    direction LR
    gz_l1["실기 · 전체 bringup 시험"]:::no
    gz_l2["대기열 정책 5개 넣기"]:::no
    gz_l3["세우기 · pregrasp 입력 모양"]:::no
    gz_l4["PR 병합 #49 → #54 → #55"]:::no
    gz_l5["처짐 실측"]:::no
  end
  classDef ok fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef code fill:#1d3a5c,stroke:#67b7e8,color:#e8eef8
  classDef no fill:#3d1616,stroke:#e06666,color:#e8eef8
```

| 노드·부품 | 한 일 | 확인 |
|---|---|---|
| **정책 계산** `ml/mlp_policy.hpp` · `export_policy.py` | ONNX 런타임 없이 C++ MLP (실시간 루프 할당 없음) · `.pt` → `.policy` | 정책 6개 모두 **C++ 값 = TorchScript 값** |
| **`/skill_context`** (`ml/SkillContext`) | coordinator → 보정 노드: skill · 단계 · 처짐 적분 여부 · 보정 가능 여부 · 목표 관절 · 도킹 목표 | 빌드 |
| **coordinator 닿는 구간** `contact_mode: sim` | 퍽·칸 위 5 cm까지 MoveIt → 정지 0.3 s → 시뮬과 같은 보간(해석 IK)으로 내려가기 → 안정 → 쥐기/놓기 → 올리기 → 대기 · 집기·놓기·싣기·꺼내기 | 기존 테스트 통과 · `moveit`이면 예전 |
| **coordinator approach** `approach_mode: sim` | 시뮬 dock_box 기준 제어 (돌기 → 직진 ≤ 0.12 m/s → 마지막 방향) | `legacy`면 예전 |
| **`rl_arm_correction`** | 명령 = JTC + 처짐 적분 + 정책 Δ, 정책 있는 skill의 닿는 구간만 · 입력 = 시뮬과 같은 순서 | 입력·적분 테스트 |
| **`rl_nav_correction`** 도킹 모드 | 도킹 skill이면 시뮬 drive_env 입력 13개 → Δv·Δw | 입력 테스트 |
| **`plan_next`** | C++ 플래너 · `planner: plan_next`면 BUILD에서 다음 퍽·복귀 시점 | Python과 40개 상태 모두 같은 행동 |
| **`hand_relative`** | 손 카메라 → 퍽 − 손 · 칸 − 퍽 · 면 방향 | 노드 시험 (가짜 TF·검출) |
| 정책 파일 | `place_cell` · `pick_upright` (팀원) · `dock_box` · `drive_straight` · `load_slot` · `plan_next` | 설치·불러오기 |

전체: pa27 ROS Lyrical에서 빌드, **ml·plan 53개 + perception 8개 테스트 통과**. 실제 로봇·전체 bringup에서는 아직 안 돌려 봄.

---

## 4. skill 37개 지도 — 영역별 상태 (17:50)

```mermaid
flowchart TB
  subgraph g4_DRIVE["주행"]
    g4_d1["dock_box ✅ 30 → 98.6 %"]:::ok
    g4_d2["drive_straight ✅ 61 → 100 %"]:::ok
    g4_d3["park_home ⏳ 대기열"]:::wip
    g4_d4["drive_arc ⏳ 대기열"]:::wip
    g4_d5["drive_turn — 기준선 100 %"]:::keep
    g4_d6["navigate ✖ 환경 없음 (Nav2)"]:::no
  end
  subgraph g4_ARM["팔"]
    g4_a1["place_cell ✅ 99 % (팀원)"]:::ok
    g4_a2["load_slot ✅ 95 → 98.3 %"]:::ok
    g4_a3["unload_slot ⏳ 학습 중"]:::wip
    g4_a4["pregrasp ⏳ 대기열"]:::wip
    g4_a5["regrasp_stood ⏳ 대기열"]:::wip
    g4_a6["pick_upright · stand_up<br/>팀원 정책 있음, 평가 필요"]:::wip
    g4_a7["move_pose · camera_clear_view<br/>camera_look_down — 기준선 100 %"]:::keep
    g4_a8["nudge_cell · stand_in_place<br/>✖ 동작·환경 없음"]:::no
    g4_a9["compensate_sag · grip_force<br/>실측 (힘 최소값만 잼)"]:::wip
  end
  subgraph g4_SENSE["인식 · 상태 · 비상 · 맵"]
    g4_s1["YOLO 학습됨<br/>detect_puck · classify_color · classify_shape_pose"]:::keep
    g4_s2["규칙<br/>태그 · 장소 상자 · 신호·바코드 · 칸 판정<br/>배터리 · 전류 · 모터 · 넘어짐"]:::keep
    g4_s3["hand_relative 🔵 (새로, 정책 입력)"]:::code
    g4_s4["맵 cuVSLAM · nvblox — 유지"]:::keep
  end
  subgraph g4_PLANS["플랜"]
    g4_p1["plan_next ✅ 가상 미션 학습<br/>🔵 로봇 코드 (#55)"]:::ok
  end
  classDef ok fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef code fill:#1d3a5c,stroke:#67b7e8,color:#e8eef8
  classDef wip fill:#3d3112,stroke:#e2a83a,color:#e8eef8
  classDef no fill:#3d1616,stroke:#e06666,color:#e8eef8
  classDef keep fill:#1c2635,stroke:#8aa0b8,color:#e8eef8
```

<details>
<summary>▶ skill 37개 전체 표 (상태·결과물)</summary>

| 영역 | skill | 방식 | 시뮬 환경 | 기준선 → 학습 뒤 | 로봇 정책 파일 |
|---|---|---|---|---|---|
| 주행 | `dock_box` | 강화학습 | drive task=dock | 30.2 → **98.6 %** | ✅ `nav_correction/dock_box.policy` |
| 주행 | `drive_straight` | 강화학습 | drive task=straight | 61.4 → **100 %** | ✅ `nav_correction/drive_straight.policy` |
| 주행 | `park_home` | 강화학습 | drive task=park | 87.5 % → 대기열 | ⏳ |
| 주행 | `drive_arc` | 강화학습 | drive task=arc | 94.5 % → 대기열 | ⏳ |
| 주행 | `drive_turn` | 강화학습 | drive task=turn | 100 % | 기준선으로 충분 |
| 주행 | `navigate` | 강화학습 | 없음 | — | Nav2 그대로 |
| 팔 | `place_cell` | 강화학습 | pip (팀원) | 96.3 → **99.0 %** | ✅ `arm_correction/place_cell.policy` (팀원 정책) |
| 팔 | `load_slot` | 강화학습 | load | 94.8 → **98.3 %** | ✅ `arm_correction/load_slot.policy` |
| 팔 | `pick_upright` | 강화학습 | pick (팀원) | — (평가 필요) | ✅ `arm_correction/pick_upright.policy` (팀원 정책) |
| 팔 | `unload_slot` | 강화학습 | unload | 90.6 % → 학습 중 | ⏳ |
| 팔 | `stand_up` | 강화학습 | right (팀원) | — | 🟡 팀원 정책 · 로봇 입력 모양 필요 |
| 팔 | `regrasp_stood` | 강화학습 | right regrasp=1 | 대기열 | ⏳ |
| 팔 | `pregrasp` | 강화학습 | reach target=above | 88~91 % → 대기열 | ⏳ · 로봇 입력 모양 필요 |
| 팔 | `camera_look_down` | 강화학습 | reach target=look | 100 % | 기준선으로 충분 (높이 0.08 m — 확인 필요) |
| 팔 | `move_pose` · `camera_clear_view` | 강화학습 | reach pose · clear | 100 % | 기준선으로 충분 |
| 팔 | `nudge_cell` · `stand_in_place` | 강화학습 | 없음 | — | 🔴 동작부터 설계 |
| 팔 | `compensate_sag` · `grip_force` | 실측 | — | — | 🟡 쥐는 힘 최소값만 잼 · 처짐 실측 필요 |
| 인식 | `detect_puck` · `classify_color` · `classify_shape_pose` | YOLO (학습됨) | — | — | `bee_yolo11n_v3` |
| 인식 | `read_puck_tag` · `detect_location_box` · `read_signal_barcode` · `judge_cell` | 규칙 | — | — | 기존 |
| 상태·비상 | `monitor_battery` · `monitor_current` · `monitor_motor` · `detect_tip_impact` | 규칙 (문턱값) | — | — | 기존 |
| 상태·비상 | `basket_ledger` · `estop` | 없음 | — | — | 기존 |
| 맵 | `slam_localize` · `build_map` · `align_arena` | 유지 | — | — | cuVSLAM · nvblox |
| 플랜 | `plan_next` | 강화학습 | 가상 미션 | 계산기 38.1점 · 학습 37.6점 (가상) | ✅ `plan/plan_next.policy` |

</details>

---

## 5. 시뮬에서 미션 전체 풀기 — 실행기 구조

```mermaid
flowchart LR
  g5_G["무작위 출제<br/>퍽 배치·누움 · 신호 · 바코드"]:::ok --> g5_C["계산기<br/>mission_rules.py"]:::ok
  g5_C --> g5_PL["플래너<br/>plan_next"]:::ok
  g5_PL --> g5_X["skill 실행<br/>(팀원 시연 동작 + 팀원 정책)"]:::wip
  g5_X --> g5_J["결과 판정<br/>시뮬 상태"]:::ok
  g5_J --> g5_PL
  g5_X --> g5_D["주행<br/>미로 지도 A* → P 제어 · 도킹 면 고르기"]:::ok
  classDef ok fill:#123d2a,stroke:#3fbf7f,color:#e8eef8
  classDef wip fill:#3d3112,stroke:#e2a83a,color:#e8eef8
```

| 문제 | 신호 · 바코드 | 결과 | 깎인 이유 |
|---|---|---|---|
| #1 | R4 Y3 G5 · P2-01 오름 | **20 / 40** (L2 +10, 복귀 +10) | 집다 떨어뜨림 1 · 놓다 누움 1 |
| #7 (화면) | R5 Y5 G2 · P2-04 내림 | **10 / 40** (복귀 +10) | 세우기 덜 섬 1 · 놓다 누움 1 · 집다 떨어뜨림 1 |

- 미션 실행기에는 아직 **팀원 정책만** 들어 있습니다 (오늘 학습한 `dock_box` · `load_slot` 등은 대기열이 끝나면 연결).
- 칸 위 누운 퍽 세우기(`stand_in_place`)가 없어서, 놓다 누우면 그 장소 점수는 못 받습니다.

---

## 6. 남은 일 — 순서대로

```mermaid
flowchart LR
  g6_A["학습 대기열 끝<br/>(남은 5개)"]:::wip --> g6_B["정책 export → model/<br/>(PR #55에 추가)"]:::no
  g6_A --> g6_S["학습 정책을 시뮬 미션에 연결<br/>→ 다시 풀기"]:::no
  g6_S --> g6_C["skill 실패 줄이기<br/>pick 평가·재학습 · stand_in_place · nudge_cell"]:::no
  g6_M["PR 병합<br/>#49 → #54 → #55"]:::wip --> g6_F["실기 · 전체 bringup 시험<br/>skill 하나씩 보정 켜 보기"]:::no
  g6_B --> g6_F
  g6_H["처짐 실측"]:::no --> g6_F
  g6_L["세우기 · pregrasp<br/>입력 모양 추가"]:::no --> g6_F
  g6_F --> g6_I["planner: plan_next로<br/>실기 미션 (마지막)"]:::no
  classDef wip fill:#3d3112,stroke:#e2a83a,color:#e8eef8
  classDef no fill:#3d1616,stroke:#e06666,color:#e8eef8
```

| 할 일 | 막히면 |
|---|---|
| 학습 대기열 남은 5개 (`unload_slot` · `pregrasp` · `park_home` · `drive_arc` · `regrasp_stood`) → 기준선보다 좋으면 `export_policy.py`로 `model/`에 | 그 skill은 보정 0 (지금 동작 그대로) |
| 학습 정책을 시뮬 미션 실행기에 연결 → 다시 풀어 점수 비교 | — |
| skill 실패 줄이기: `pick_upright` 평가·재학습 · `stand_in_place`·`nudge_cell` 동작·환경 | 놓다 누우면 그 장소 0점 |
| PR 병합: #49 → #54 → #55 (+ #53 · #56) | 로봇에 배포 코드가 없음 |
| **실기 · 전체 bringup 시험**: 보정 끈 채로 먼저, 그다음 skill 하나씩 켜기 (`enabled` · 정책 파일) | 정책이 실기에서 맞는지 모름 |
| 처짐 실측 · 처짐 적분 이득 확인 | 팔 정책이 실기에서 어긋날 수 있음 |
| 세우기 · pregrasp 입력 모양 추가 | 그 skill은 보정 0 |
| 상자 밀림 보정 (`HandTarget.box_tag`) · `camera_look_down` 높이 (0.15 m → 0.08~0.10 m) | — |
| 마지막: `planner: plan_next`로 실기 미션 | 규칙 순서로 동작 |

---

## 7. 브랜치 · PR · 파일 위치

| PR | 브랜치 → base | 들어 있는 것 |
|---|---|---|
| [#49](https://github.com/visualkhh/Lv2_bee_Assignment/pull/49) | `feature/mission-flow` → develop | mission_manager · mission_solver · coordinator 좌표 skill (먼저 병합) |
| [#53](https://github.com/visualkhh/Lv2_bee_Assignment/pull/53) | `feature/skill-learning` → develop | `learning/skills.yaml` (skill 37개 · 계약 · 배포 조건) · `learning/plan/` (가상 미션 · 플래너 학습 · 계산기 순서) |
| [#54](https://github.com/visualkhh/Lv2_bee_Assignment/pull/54) | `feature/hand-relative` → develop | 인식 `hand_relative` · `HandTarget`/`HandRelative` · API.md |
| [#55](https://github.com/visualkhh/Lv2_bee_Assignment/pull/55) | `feature/policy-deploy` → `feature/mission-flow` | 로봇 배포: 보정 컨트롤러 · `SkillContext` · coordinator 닿는 구간·approach · `plan_next` · 정책 파일 (`ros2_ws/model/`) — #49·#54 포함, 최신 develop 포함 |
| [#56](https://github.com/visualkhh/Lv2_bee_Assignment/pull/56) | `feature/skill-envs` → 팀원 `feature/isaac-lab` | Isaac 학습 환경 `slot_env` · `reach_env` · `drive_env` · 학습 대기열 `train_queue.sh` · 미션 실행기 `mission_run.py` |
| — | pa27 `~/bee_skill` | 학습 중인 복사본 · `logs/queue_summary.tsv` (학습 결과 한 줄씩) |
