# 11-03 정리 — skill 학습부터 로봇 배포까지

> 2026-11-03 19:50 (pa27 시각) 기준. 오늘 이야기하고 정하고 만든 것을 한 장에 모았습니다.
> 자세한 내용: [전체 지도](system-map.html) · [skill별 학습 조건](skill-training.html) · [학습용 skill 구성](skill-learning.html)

---

## 1. 정한 것 (결정)

| # | 결정 | 이유 |
|---|---|---|
| 1 | 미션에 필요한 능력을 **학습 가능한 작은 skill 37개**로 나누고 skill마다 학습 (개수가 목표가 아님) | 팀 방향 |
| 2 | **움직이는 skill만 강화학습** (18개) · 인식은 **이미 학습된 YOLO**와 규칙 · 상태·비상은 문턱값 규칙 · 처짐·쥐는 힘은 실측 | 판단만 하는 skill은 행동이 다음 상황을 바꾸지 않아 강화학습이 맞지 않음, YOLO가 이미 학습됨 |
| 3 | 플래너는 **계산기(정답 규칙) + 학습 모델(다음 skill 고르기)** 둘 다 준비, 학습 플래너 로봇 연결은 **마지막** | 목표 칸은 규칙이 정답, 순서·실패 대처는 학습 |
| 4 | **배포 방식**: 빈 공간 이동은 MoveIt·Nav2 그대로, **퍽에 닿는 짧은 구간과 상자 앞 도킹만 시뮬과 같은 기준 동작 + 학습 보정** (11-02 "팔은 전부 MoveIt"에 닿는 구간만 예외) | 잔차 정책은 학습 때 쓴 기준 동작 위에서만 맞음 · Plan-Seq-Learn · ManipGen과 같은 구조 |
| 5 | 로봇에 없던 정책 입력(손 카메라 상대값)은 **인식에서 만들어 줌** (정책 그대로) | 다시 학습하지 않으려고 |
| 6 | 정책 계산은 **ONNX 런타임 없이 C++로 직접** (`.policy` 파일) | 정책이 작은 MLP · Jetson에 설치할 것 없음 · 실시간 루프 안전 |
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
| `load_slot` | 94.8 % | 98.3 % (놓침 1.0 %) | ⚠️ **재학습 중** (19:36~) |
| `unload_slot` | 93.7 % | **98.1 %** | 넣을 차례 |
| `pregrasp` | 89.3 % → 환경 고친 뒤 99.5 % | 95.4 % | ⚠️ **재학습 중** (load_slot 다음) |
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
