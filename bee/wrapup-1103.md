# 정리 · 결정 기록 — skill 학습부터 로봇 배포까지

> 2026-11-03 20:50 (pa27 시각) 기준 · 11-04 · 11-06 추가는 바로 아래. 오늘 이야기하고 정하고 만든 것을 한 장에 모았습니다.
> 자세한 내용: [실기 디버깅 가이드](debug-guide.html) · [전체 지도](system-map.html) · [skill별 학습 조건](skill-training.html) · [학습용 skill 구성](skill-learning.html)

---

## 11-06 추가 — 동료 develop 변경 반영 (#63 · #65 · #75)

### 동료가 develop에 넣은 것 (#59 이후)
| PR · 커밋 | 내용 | 내 구조와 |
|---|---|---|
| #63 인지 | YOLO v4 · **물체 기억을 인지에서 뺌** (`long_memory: false` — 안 보이면 2초 뒤 지움) | 기억은 **mission_manager(나)가** → PR #72 |
| #64 Isaac | 관절 비틀림 시뮬 · 렌더 RTX Real-Time · 자동 Play(`BEE_AUTOPLAY`) 삭제 | #62 다시 맞춤 필요 |
| #65 주행 | Nav2 컨트롤러 = **`RlNavController`** (ONNX, 속도를 직접 냄 · 끄면 DWB) · **`rl_nav_correction` · `rl_nav_tuner` 삭제** · twist_mux 입력 `/cmd_vel_nav` | 충돌 없음 — 도킹 정책은 #59에서 `skill_approach`로 옮겨 둠 |
| 직접 커밋 | stow 자세 변경 `[0, −1.9024, 1.344, 0.9023, 0]` · 매핑 중 자동 스캔 자세 끔 · `rl_arm_correction` 중력 앞먹임(기본 끔) | 모든 설정 일관되게 바뀜 |

### 정한 것
| # | 결정 | 이유 |
|---|---|---|
| 16 | **물체 기억은 mission_manager** — 퍽은 tag와 조사한 자리로 기억, 트랙 id는 집기 직전에 다시 찾음 (PR #72) | 인지는 "본 것만" (11-04 결정) · coordinator·skill은 실행부 |
| 17 | 중력 보정은 **하드웨어 인터페이스에서 명령 · 상태 양쪽**이 맞음 (제안 — 송정혁과 협의) | 명령만 고치면 TF · 자세 확인 · 정책 입력이 어긋남 |
| 18 | 보정은 **오차가 생기는 층에 하나씩** — 한곳에 모으지 않음 (보는 곳 = 디버그 토픽은 모음) | 주기·책임이 다름 · 끄고 켜서 원인 나누기 |
| 19 | **팔 정책 배포 경로는 하나** — skill 노드 → `/skill_context` → `rl_arm_correction`(컨트롤러 플러그인 안 C++). #75로 함께 들어온 파이썬 정책 노드(`rl_policy_node.py`) · `plan/arm_ik` · `rl_segment` · `stand_geometry` · 정책 사본은 #59 이전 구조용이라 연결 안 됨 — 같은 일은 skills 쪽이 이미 함 → 정리 대상 | 시뮬과 같은 타이밍(제어 주기 안 계산) · 실패하면 Δ = 0 · Jetson에 PyTorch 불필요. 약점(변환 · C++ 관측)은 같은 출력 시험 · `meta.yaml` 관측 확인으로 막음 — [두 방식 비교](policy-path.html) · 정리 PR #77 |
| 20 | 중력 처짐은 **상태 = 하드웨어(`twist_state`) · 명령 = 컨트롤러 앞먹임**으로 나눔 (#75, 둘 다 기본 켬) | TF · MoveIt · 손 카메라 위치가 실제 팔과 맞음 → 카메라 hand-eye 보정은 이 뒤 |

### 지금 주행 명령 경로
`Nav2(NavFn A*) → RlNavController` · `skill_approach(도킹 정책 4개)` → `/cmd_vel_nav` → twist_mux → velocity_smoother → collision_monitor → `/cmd_vel`

할 일 목록: [할 일 · 진행](work-plan.html)

---

## 11-04 추가

### 정한 것
| # | 결정 | 이유 |
|---|---|---|
| 11 | **skill마다 노드 하나** — coordinator가 하던 팔·주행 동작을 skill 노드 9개로 (`/skills/<skill>` 액션). coordinator는 계획 검증·순서·적재함 장부·모드 취소만 | skill 단위로 고치고·바꾸고·시험하기 · coordinator가 너무 큼 (1645줄) |
| 12 | **학습 정책은 skill 노드가 갖고 관리** — `model/skills/<skill>/` (`.policy` · `.onnx` · `meta.yaml`). 팔 정책 **계산은 그대로 제어 루프 안** (skill 노드가 정책 경로를 알려 줌) · 주행 정책은 `skill_approach`가 직접 | 노드에서 팔 정책을 계산하면 지연·흔들림으로 시뮬과 달라짐 · 주행은 원래 20 Hz 노드라 그대로 |
| 13 | 프로세스는 두 컨테이너 (팔 `arm_skills` · 주행 `base_skills`) | Jetson 부담 · 팔은 한 번에 하나 |
| 14 | 동료 정책 `park_home` · `drive_arc` 사용, `regrasp_after_stand`(78.2 %)는 보류 (`use: false`) | 합격 기준 · 로봇 입력 모양 없음 |
| 15 | Nav2 전역 경로 A* (PR #58) · L2 장소 박스 205 (운영 확인) · 처짐 적분 발열 방지 (stow에선 풂 · 막히면 풂) | |

### 노드 — 새로 생긴 것
| | 이름 | 무엇 |
|---|---|---|
| 🆕 패키지 | `skills` | skill 노드 9개 (컴포넌트) — skill_navigate · skill_approach · skill_pose · skill_inspect · skill_pick · skill_place · skill_load · skill_unload · skill_stand |
| 🆕 액션 | `plan/action/Skill` · `/skills/<skill>` | goal: target · pose · shape · tag · slot · values → result: success · reason |
| ✏️ 바뀜 | `coordinator` | 계획 검증 · 순서 · 물체 → 좌표 · 적재함 장부 · 모드 취소만 (팔·주행 동작 · 시작·스캔 자세는 skill 노드로) |
| ✏️ 바뀜 | `rl_arm_correction` | 정책을 미리 들지 않고 `/skill_context`의 정책 경로를 받아 씀 · `~/debug` · 발열 방지 |
| ✏️ 바뀜 | `rl_nav_correction` | 도킹 모드 뺌 → 속도 제한만 (주행 정책은 skill_approach) |
| 🆕 파일 | `model/skills/<skill>/` 10개 | 8개 사용 · 2개 보류 |

자세히: [skill 노드 구성](skill-nodes.html) · 성능: [스펙·성능표](robot-spec.html)

---

> 아래는 **11-03 기록** (노드 표 4장은 skill 노드로 나누기 전 구성)

## 1. 정한 것 (결정)

| # | 결정 | 이유 |
|---|---|---|
| 1 | 미션에 필요한 능력을 **학습 가능한 작은 skill 37개**로 나누고 skill마다 학습 (개수가 목표가 아님) | 팀 방향 |
| 2 | **움직이는 skill만 강화학습** (18개) · 인식은 **이미 학습된 YOLO**와 규칙 · 상태·비상은 문턱값 규칙 · 처짐·쥐는 힘은 실측 | 판단만 하는 skill은 행동이 다음 상황을 바꾸지 않아 강화학습이 맞지 않음, YOLO가 이미 학습됨 |
| 3 | 플래너는 **계산기(정답 규칙) + 학습 모델(다음 skill 고르기)** 둘 다 준비, 학습 플래너 로봇 연결은 **마지막** | 목표 칸은 규칙이 정답, 순서·실패 대처는 학습 |
| 4 | **배포 방식**: 빈 공간 이동은 MoveIt·Nav2 그대로, **퍽에 닿는 짧은 구간과 상자 앞 도킹만 시뮬과 같은 기준 동작 + 학습 보정** (11-02 "팔은 전부 MoveIt"에 닿는 구간만 예외) | 잔차 정책은 학습 때 쓴 기준 동작 위에서만 맞음 · Plan-Seq-Learn · ManipGen과 같은 구조 |
| 5 | 로봇에 없던 정책 입력(손 카메라 상대값)은 **인식에서 만들어 줌** (정책 그대로) | 다시 학습하지 않으려고 |
| 6 | 정책 계산은 **ONNX 런타임 없이 C++로 직접** (`.policy` 파일) — **11-09 바뀜: PR #97 기본 ONNX Runtime, 정책마다 `.policy`로 되돌림 ([ONNX 실행 구조](onnx-runtime.html))** | 정책이 작은 MLP · Jetson에 설치할 것 없음 · 실시간 루프 안전 |
| 7 | **처짐 적분은 팀원(송정혁) 방식**: 시간 기준 · reference 멈춤일 때 · 4.2/s · `~/reset_sag` · skill과 상관없이 늘 — 그 위에 학습 보정 | 늘 처짐을 고쳐 주고 coordinator가 이미 reset_sag를 부름 |
| 8 | skill 이름에 퍽 상태를 드러냄: `pick_standing_puck`(서 있는 퍽 집기, 예전 `pick_upright`) · `stand_lying_puck`(누운 퍽 세우기, 예전 `stand_up`) · `regrasp_after_stand` · `stand_puck_in_cell` · `--task pick_standing` / `stand_lying` (예전 이름도 됨) | `upright`·`right`·`stand`가 헷갈림 |
| 10 | 합격 기준 못 넘은 `load_slot`(놓침 1.0 %) · `pregrasp`(95.4 %)는 **재학습** — 놓침 벌점 5→20 · 못 가는 목표 빼고 멈춤 시간 늘림 | 기준: 성공 ≥ 97 % · 되돌릴 수 없는 실패 ≤ 0.5 % |
| 9 | PR은 **따로 (A안)** + 한꺼번에 합쳐 보는 **통합 PR**도 | 리뷰는 나눠서, 시험은 합쳐서 |

---

## 2. 만든 것

| 갈래 | 내용 | 확인 | PR |
|---|---|---|---|
| skill 목록·계약 | `learning/skills.yaml` — skill 37개 · 방식 · 기준선 · 시작·성공 · 보상·평가 · task → skill · **배포 조건** | 테스트 | [#53](https://github.com/visualkhh/Lv2_bee_Assignment/pull/53) |
| 플래너 학습 | 가상 미션 · 지금 규칙 · 계산기(최단 순서) · MaskablePPO + 따라 하기 | 가상 미션 1000판: 규칙 38.14 · 계산기 38.11 (시간 −8 %) · 학습 37.55점 | #53 |
| Isaac 학습 환경 | 적재함(`slot_env`) · 팔 자세(`reach_env`) · 주행(`drive_env`) 새로 · 팀원 놓기·집기·세우기 환경 연결 · 학습 대기열 `train_queue.sh` | pa27 RTX 5060 | [#56](https://github.com/visualkhh/Lv2_bee_Assignment/pull/56) |
| 시뮬 미션 실행기 | 무작위 출제 → 계산기 → 플래너 → skill → 판정, 미로 지도 A* 주행 · 도킹 면 고르기 | 문제 #1 **20 / 40점** · #7 10 / 40점 | #56 |
| 손 카메라 상대값 | 인식 노드 `hand_relative` · `HandTarget`·`HandRelative` | 테스트 + 가짜 TF·검출로 손 계산과 같음 | [#54](https://github.com/visualkhh/Lv2_bee_Assignment/pull/54) |
| 로봇 배포 | C++ 정책 계산 · `/skill_context` · `rl_arm_correction` 정책 · `rl_nav_correction` 도킹 모드 · coordinator 닿는 구간·approach · `plan_next` C++ · 정책 파일 | ROS 빌드 · 테스트 (정책 C++ = TorchScript · 플래너 Python과 40개 상태 일치) | [#55](https://github.com/visualkhh/Lv2_bee_Assignment/pull/55) |
| 통합 | 위 전부 + 팀원 `isaac-lab` 한 브랜치 `feature/skill-all` (팀원 처짐 적분과 합침) | 테스트 **71개** 통과 | [#57](https://github.com/visualkhh/Lv2_bee_Assignment/pull/57) → `feature/isaac-setup` |
| 문서 | bee 페이지: 학습용 skill 구성 · skill별 학습 조건 (보상 함수 10장) · 전체 지도 · 이 정리 | | |

---

## 3. 학습 결과 (기준선 = 학습 없이 기준 동작만 → 학습 뒤, 1024판)

| skill | 기준선 | 학습 뒤 | 로봇 정책 파일 |
|---|---|---|---|
| `dock_box` | 30.2 % | **98.6 %** | ✅ |
| `drive_straight` | 61.4 % | **100 %** | ✅ |
| `load_slot` | 94.8 % | 1차 98.3 % (놓침 1.0 %) → **재학습 99.0 % (놓침 0.49 %)** | ✅ 정책 파일 바꿈 |
| `unload_slot` | 93.7 % | **98.1 %** | ✅ |
| `pregrasp` | 89.3 % → 환경 고친 뒤 **99.5 %** | 95.4 % → 재학습 99.6 % | 기준선으로 충분 (정책 안 씀) |
| `place_cell` (팀원) | 96.3 % | 99.0 % | ✅ |
| `pick_standing_puck` · `stand_lying_puck` (팀원) | 평가 필요 | | `pick_standing_puck` ✅ |
| `park_home` · `drive_arc` · `regrasp_after_stand` | | | 동료가 학습 |
| `move_pose` · `camera_clear_view` · `camera_look_down` · `drive_turn` | 100 % | — | 기준선으로 충분 |

오늘 고친 학습 문제: `load_slot` 놓침 20 % → **환경 오류**(기운 손에 퍽을 똑바로 넣음) · `dock_box` 학습이 무너짐 → **행동 표준편차 0** (로그 공간으로) · 보정 폭 줄임

---

## 4. 노드 — 새로 생긴 것은 1개, 나머지는 기존 노드에 기능 추가

| | 이름 | 무엇 |
|---|---|---|
| 🆕 **새 노드** | `hand_relative` (perception) | 손 카메라 검출 + TF → 퍽 − 손 · 칸 − 손 안 퍽 · 면 방향 (정책 입력) |
| ✏️ 기능 추가 | `rl_arm_correction` (ros2_control 컨트롤러) | 학습 정책 계산 · 처짐 적분(팀원) · `~/reset_sag` |
| ✏️ 기능 추가 | `rl_nav_correction` | 도킹 모드 (도킹 skill일 때만 정책 보정) |
| ✏️ 기능 추가 | `coordinator` | 닿는 구간 시뮬 기준 동작 (`contact_mode`) · approach 시뮬 P 제어 (`approach_mode`) · `/skill_context` · `/hand_relative/target` 보냄 |
| ✏️ 기능 추가 | `mission_manager` | `planner: rule \| plan_next` (학습 플래너는 노드 안에서 돎) |
| 🆕 메시지 | `ml/SkillContext` · `perception/HandTarget` · `perception/HandRelative` | |
| 🆕 토픽 · 서비스 | `/skill_context` · `/hand_relative/target` · `/hand_relative` · `/rl_arm_correction/reset_sag` | |
| 🆕 파일 | `ros2_ws/model/arm_correction/*.policy` · `nav_correction/*.policy` · `plan/plan_next.policy` | 학습 결과물 |

학습 모델은 새 노드를 만들지 않고 **기존 노드 3곳 안에서** 돕니다: `rl_arm_correction` · `rl_nav_correction` · `mission_manager`.

---

## 5. 오늘 배운 것 · 고친 실수

| 무엇 | 어떻게 |
|---|---|
| 학습 계획에 **배포 조건**(기준 동작이 로봇과 같은가 · 입력을 로봇에서 얻는가 · 어느 노드에서 도는가)이 빠졌었음 → 시뮬(IK)과 로봇(MoveIt)이 어긋남 | `skills.yaml`에 `deploy` 항목 + 테스트로 강제 · 배포 결정 4번 |
| 팀원이 같은 파일(`rl_arm_correction`)을 이미 고친 줄 모르고 새로 씀 | 통합할 때 발견 → 팀원 처짐 적분 + 우리 정책으로 합침 (결정 7) |
| 페이지에 기준 시각을 짐작으로 적음 (21:30 등) | pa27 시각으로 고침 |
| 시뮬 미션: 로봇이 상자를 밀어 먼저 놓은 퍽이 어긋남 | 원인 = 제자리 회전 때 뒤 모서리 0.29 m → 정렬 거리 · 지도 여유 늘림 |

---

## 6. 남은 일

| 할 일 | 누가 · 어떻게 |
|---|---|
| 학습 남은 3개 (`park_home` · `drive_arc` · `regrasp_after_stand`) | 동료 (메시지 보냄) · 그 밖에 팀원 정책 평가(`pick_standing_puck` · `stand_lying_puck`) 또는 더 오래·가중치 바꿔 학습 — 메시지 준비됨 |
| 끝난 정책 `.policy`로 넣기 (`unload_slot` · `pregrasp` …) | `export_policy.py` → `ros2_ws/model/` |
| **통합 PR #57 충돌 정리** — `feature/isaac-setup`(10-22~27)과 Isaac 자산 약 66개 파일 (텍스처 PNG 33 · usd/usda 약 20 · urdf) | 확인 뒤 (develop 쪽이 최신으로 보임 — #46 최종 urdf·usda) |
| PR 병합 순서 | #49 → #54 → #55 (+ #53 · #56) 또는 #57로 한꺼번에 |
| **실기 · 전체 bringup 시험** | 보정 끈 채로 먼저 → skill 하나씩 켜기 |
| 세우기 · pregrasp 로봇 입력 모양 · 처짐 실측 · `camera_look_down` 높이(0.15 → 0.08~0.10 m) · 상자 밀림 보정 | |
| skill 실패 줄이기 (시뮬 미션 점수) — `pick_standing_puck` 재학습 · `stand_puck_in_cell` · `nudge_cell` | |
| 마지막: `planner: plan_next`로 실기 미션 | |
