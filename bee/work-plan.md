# 할 일 · 진행 — 실제 문제를 잘 풀기 위해

> 2026-11-06 기준 · **PR 정리(11-06 저녁): #75(Isaac 재구성 · 팔 처짐 TF)를 먼저 develop에 넣고, 내 PR #72·#73·#74와 트윈(#62)은 그 기준으로 다시 만듦 — 지금은 닫아 둠(브랜치 유지)** · 작업이 끝날 때마다 이 표의 **상태**를 고칩니다. 근거: 발제 채점표(`documents/mission/README.md` 7장) · develop 코드
> **11-09 상태:** develop `3a6d668` — 11-06 뒤 병합 #76 · #77 · #78 · #79 · #80 · #81 · #82 · #84 · #87 · #89 · #90(모델 `ros2_ws/model/` → `models/` · `tool/` → `tools/`) · #92 · #95. **열림:** PR #97 (모든 학습 정책 ONNX Runtime · 정책마다 `.policy`로 되돌림, CI 통과 — [ONNX 실행 구조](onnx-runtime.html)) · #96 (#83이 `feat/inspect-box-look`에만 병합돼 develop으로 다시 올린 것)
> 관련: [정리 · 결정 기록](wrapup-1103.html) · [전체 지도](system-map.html) · [로봇 스펙 · 성능표](robot-spec.html)

---

## 점수 구조 — 어디서 점수가 나고 어디서 날아가나

| 묶음 | 점수 | 무엇에 달렸나 |
|---|---|---|
| 신호 순서 12 · 횟수 9 · 바코드 4 · 배정 9 | **34** | 출발 구역 인식만 — 싸게 얻지만 **틀리면 안전 정지 → 뒤의 66점까지 날아감** |
| 색·모양 18 · 주사위 눈 30 | **48** | 장소마다 **전부** 맞아야 6 + 10 — **퍽 하나 잃으면 그 장소 16점 0** |
| 재검증 8 | 8 | **새 관측** 기록이어야 인정 (목표를 복사한 로그는 0) |
| 복귀 10 | 10 | 차체 전체가 출발 구역 안에서 3초 정지 |
| 자율 완주 +5 | | 위가 **전부** 성공일 때만 |

발제에는 **"감점 · 시간 가산점 없음 · 시간 제한 없음"**. 그래서 여기서 말하는 벌점 = 점수를 통째로 날리는 것 (안전 정지 · 퍽 잃음 · 완주 실패),
속도 = 배터리 안에 끝내기 · 연습 반복 횟수 · 도전 과제 C(이동 경로 개선).

시뮬 완주 기록(11-03)에서 깎인 점수는 **모두 skill 실패**(떨어뜨림 · 놓다가 누움 · 덜 섬) — 순서 최적화보다 **잃지 않기**가 먼저.

---

## develop 점검 (11-06 저녁, `5687a3a` — #76 병합 뒤)

| # | 고칠 것 | 종류 | 처리 |
|---|---|---|---|
| 1 | `stand_test.launch.py`가 지워진 `rl_nav_correction`을 띄움 | **동작** | PR #78 → ✅ 11-07 병합 |
| 2 | 연결 안 된 `rl_policy_node.py` · `plan/arm_ik` · `rl_segment` · `stand_geometry` · 정책 사본 | 정리 | PR #77 → ✅ 11-06 병합 |
| 3 | nvblox 지도 감쇠 켜짐 — 지나온 곳이 지도에서 사라짐 | **동작 (실기도)** | 브랜치 `fix/nvblox-no-decay` 다시 올리기 — ⏳ 11-09 develop에 없음 (#74 닫힌 채) |
| 4 | Isaac 손목 카메라 깊이 문이 stow에서 열림 → 매핑 중 로봇 몸이 지도에 찍힘 · `coordinator` scan_pose 덮어쓰기(없는 파라미터) | **동작 (시뮬)** | 트윈 브랜치에 고침 — 새 폴더로 옮겨 다시 |
| 5 | mission_manager 물체 기억 없음 — 집기 직전 "not tracked" | **동작** | **PR #79** → ✅ 11-07 병합 |
| 6 | 자세 허용 오차 `scan_pose_tolerance` 0.16 · `initial_pose_tolerance` 0.08 — `twist_state` 켬이 기본이라 넓을 필요 없음 | 설정 | 0.05로 되돌리기 (#75 작성자 확인) — ⏳ 11-09 develop 그대로 (`scan_pose.yaml` 0.16 · `skills.yaml` 0.08) |
| 7 | `isaac/scripts/calib/gravity_comp.py`가 컨트롤러가 안 받는 `/rl_arm_correction/delta`로 보냄 → 동작 안 함 (같은 일은 `gravity_enabled`) | 도구 | **PR #77에 삭제 추가** → ✅ 삭제 병합 · `calib.md` 앞먹임 시험을 새 방법으로 (확인 못 함) |
| 8 | `RlNavController` 후진 허용(`v_min_ratio: -0.2`) · 뒤 센서 없음 | 안전 | 주행 정책 들어올 때 확인 — ⏳ 11-09 develop `nav2_params.yaml` 그대로 −0.2 |
| 9 | `.gitignore` `*.pt` · `*.onnx` 전체 무시 (57~58행) — 다시 학습한 skill 정책이 커밋에서 빠짐 | 설정 | 학습 출력 폴더만 빼도록 좁히기 — ✅ develop `.gitignore`에서 `*.pt` · `*.onnx` 줄 없어짐 (a525125, 11-06) |
| 10 | `model/skills/pregrasp/meta.yaml` `layout: -` — 일반 YAML로 못 읽음 (skill 노드는 줄 단위라 동작 문제 없음) | 정리 | `layout: none` — ⏳ 11-09 `models/skills/pregrasp/meta.yaml` 그대로 `-` |
| 11 | 문서: `API.md` 500~502 · `01-arch.md` 그림 · `05-arm.md` 97 — "coordinator → move_group" (#59 뒤로 팔 skill 노드) | 문서 | 고치기 — ⏳ 11-09 `API.md` 500~502 · `01-arch.md` 그대로 |
| 12 | 문서: `API.md` 51 · `09-nodes.md` 12 · `stand_test` 설명 — "퍽은 안 보여도 기억" (#63 뒤로 인지는 본 것만) | 문서 | 고치기 — ⏳ 11-09 `API.md` 51 · `09-nodes.md` 12 그대로 |
| 13 | 문서·주석: `05-arm.md` · `stand_table_export.py` 사용법이 옛 `isaac/lab` 경로 · `rl_arm_correction.hpp`의 `isaac/sim` | 문서 | 고치기 (출처 설명은 그대로) |
| 14 | 중력 토크 식 사본 3곳 · 강성 값 2곳 (`urdf.xacro` · `controllers.yaml`) | 유지보수 | 메모 |
| 15 | `ml/CMakeLists.txt` 겹친 `find_package` 6줄 (#75 병합 때) | 정리 | **PR #77에 추가** → ✅ develop에 겹친 줄 없음 |

---

## P0 — 실기에서 미션을 멈추게 할 것

| # | 일 | 왜 | 어디 | 담당 | 상태 |
|---|---|---|---|---|---|
| 1 | **물체 기억** — 퍽은 tag로 기억, 집기 직전에 트랙 다시 찾기 | 인지가 안 보이는 퍽을 2초 뒤 지움(`long_memory: false`) → `pick <옛 id>`가 "not tracked"로 거부 | `mission_manager` `grab` · `locate` · `puck_for` | 나 | ✅ **#79로 develop 병합 (11-07)** |
| 2 | 위치 추정 정확도 확인 | 도킹 1 cm · 칸 10 mm가 전부 `map` 좌표 기준 · 트윈 11-04: 2~4 m · **11-06 (develop 반영 · RTX 렌더): 0.2~0.5 m · 방향 +7~11° 고정 치우침** | ① cuVSLAM 지도 저장·불러오기 ② 상자 태그로 경기장 정렬 ③ 회전 속도 제한 · 카메라 30 fps · (IMU 섞기) | 나 | 🔍 **원인 찾음**: ⓐ 제자리 빠른 회전(50~87°/s, 15 fps)에서 cuVSLAM 방향이 2~4°씩 미끄러짐 ⓑ 그래서 저장 지도가 **4.25° 돌아** 만들어짐 ⓒ 미션 때 cuVSLAM은 저장 지도를 안 불러오고 0°에서 새로 시작 → 지도와 4° 어긋나 벽이 겹치고 경로 확인 실패(미션 첫 이동에서 멈춤) |
| 3 | 신호 · 바코드 시작 단계 실기 시험 | 34점 · 틀리면 안전 정지 | signal_decoder 두 사이클 확인 · STOP 기준 (조명·거리 바꿔서) | 인지 + 나(흐름) | ⏳ |
| 4 | 중력 보정 → 하드웨어 층 (명령 · 상태 양쪽) | 명령만 고치면 TF·자세 확인·정책 입력이 d만큼 어긋남 | `BeebotSystemHardware` read (상태) · `rl_arm_correction` (명령 앞먹임) | 송정혁 | ✅ **#75로 develop** — `twist_state` 기본 켬 · 상태 = 엔코더 + d · TF = 실제 팔 (실기 손끝 높이 8.5 → 7.03 cm, 실측 7 cm). 남은 것: 자세 허용 오차 정리 · 강성 값 두 곳 일치 유지 |
| 5 | `RlNavController` 후진 확인 | 정책이 −0.052 m/s 후진 가능 · 뒤를 보는 센서 없음 (DWB는 후진 금지) | `nav2_params` `v_min_ratio` | visualkhh에게 공유 | 💬 공유 필요 |

## P1 — 점수 잃지 않기

| # | 일 | 어디 | 상태 |
|---|---|---|---|
| 6 | 퍽 안 잃기 — 쥐는 힘 · 잡기 판정 실기 확인 | `arm_io` `grip_current_a` · `grasp_min_*` | ⏳ |
| 7 | 칸 복구 skill — 놓다가 누운 퍽(`stand_puck_in_cell`) · 조금 어긋난 퍽(`nudge_cell`) | 기준 동작 → 학습 환경 | ⏳ 보류 skill |
| 8 | 재검증 8점 — 새 관측으로 장소별 ID · 위치 기록 | `mission_manager` verify 로그 | ⏳ |
| 9 | 복귀 10점 — park_home 3초 정지 · 차체 전체 구역 안 | `skill_approach` park_home | ⏳ |
| 10 | 카메라 보정 — 기둥 외부 보정 · 손목 hand-eye(4번 **뒤에**) | `tool/calib/cam_extrinsic.py` (준비만) | ⏳ |

## P2 — 속도

| # | 일 | 효과 | 상태 |
|---|---|---|---|
| 11 | skill별 시간 측정 (트윈 · rosbag) | 줄일 곳을 숫자로 | ⏳ |
| 12 | 최단 순서 계산기를 로봇에 — `solver.py` DP → `mission_manager` `planner: solver` | 왕복 감소 · 도전 과제 C | ⏳ |
| 13 | 적재함 12칸으로 한 바퀴 수집 → 배치 왕복 줄이기 | 왕복 감소 | ⏳ |
| 14 | `plan_next` 측정 성공률로 재학습 (마지막) | 다시 시도 / 포기 판단 | ⏳ |

## 바탕 — 반복 속도를 정하는 것

| 일 | 상태 |
|---|---|
| **팔 정책 배포 경로 하나로 정리** (결정 19) — 연결 안 된 `rl_policy_node.py` · `plan/arm_ik` · `rl_segment` · `stand_geometry` · `model/arm_correction/` · `ml/policies/` 지우기 · `.pt` ↔ `.policy` 같은 출력 시험 · `meta.yaml` 관측 확인 | ✅ **PR #77 병합 (11-06)** — 같은 출력 시험은 🔧 PR #97(열림: `.policy`↔`.onnx` · 불러올 때 검산) · `meta.yaml` 관측 구성 확인은 남음 · [두 방식 비교](policy-path.html) |
| #62 트윈을 develop에 맞춤 (충돌 · 새 stow · 손목 카메라 문 닫기 · 자동 Play · `YOLO_VENV`) | 🔧 rebase · 수정 · pa27 빌드 · 매핑 실행 확인 (자동 Play · 손목 카메라 문 OK) |
| explorer — 탐사 끝 뒤 멈춤 (새 목표 안 보냄 · EXPLORE 다시 들어오면 새로) | ✅ #62에 커밋 |
| twin.sh 매핑 — 3분마다 지도 저장 (`nvblox ~/save_map`) | ✅ #62에 커밋 예정 · Isaac이 멈춰도 지도 유지 |
| **nvblox TSDF 감쇠 끔** — 지나온 곳이 몇 초 뒤 지도에서 사라지던 것 (실기도 같음) | ✅ 트윈에서 지도 유지 확인 (PR #74 → #75 뒤 다시) |
| ⚠️ Isaac 메모리 누수 — 분당 0.7~1.1 GB · 약 25분이면 30 GB 바닥 (12:44 OOM) | ✅ **원인 찾음**: Isaac 6.1이 ROS Lyrical을 '실험'으로 붙여 **camera_info 발행 노드(ROS2CameraInfoHelper)**가 샘 (렌더 방식·브리지 아님 — 하나씩 끄며 9번 측정). 고침: 그 노드 끄기 (camera_adapter가 이미 camera_info를 따로 냄) → **PR #76** ✅ 11-06 병합 (고친 뒤 새 구조 측정은 남음) |
| ⚠️ 같은 ROS 도메인(0)에 다른 기기 노드(`/xstingbase` 등)가 있음 — 트윈은 도메인 31로 | 메모 |
| 트윈 **자동 채점** — 정답(`problem.json`) + Isaac 실제 위치(`truth.json`) vs 로봇 기록 → 원점수 100 · 통합 25 | 🔧 `score_run.py` 자체 확인 통과 · 미션 실행으로 확인 남음 |
| 문서 정리 — `learning/skills.yaml` `runs_in` · bee 페이지 속도 경로(`/cmd_vel_corrected` → `/cmd_vel_nav`) · 빈 `model/nav_tuner/` | ✅ skills.yaml · stand_test launch(지워진 노드 띄우던 것) · hand_relative 설명 · download.sh → **PR #78** ✅ 11-07 병합 (#73 대신) · `nav_tuner`는 동료가 #71로 삭제 · bee 페이지 경로는 아래에서 |
| 새 stow(11-05)로 팔 정책 재평가 (1024판) | ✅ pregrasp 100 % · load_slot 99.1 % · unload_slot 97.6 % — 떨어짐 없음 ([성능표](robot-spec.html)) |
