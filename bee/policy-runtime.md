# 정책은 어떤 코드가 어떤 순서로 실행하나 (11-09 · PR #97 적용 기준)

> **PR [#97](https://github.com/visualkhh/Lv2_bee_Assignment/pull/97) 적용 기준** (브랜치 `feat/onnx-all-policies` `5381439` = develop `3a6d668` + #97 · CI 통과 · develop 병합 전). 파일 경로는 `lv2_module6/ros2_ws/src/` 기준, `파일:줄`은 그 브랜치 줄 번호.
> #97 전(develop) 구조는 계산기만 `MlpPolicy` + `.policy`이고 고르기·실행 위치는 같음 — 이 페이지 이전 판은 pages 저장소 git 기록(`afbd75f`).
> 관련: [팔 정책은 어디서 도나 — 두 방식 비교](policy-path.html) · [지금 구조 — 노드 · 플러그인](system-now.html) · [문제 풀이 흐름](mission-solve.html)
> 계산기(`ml::Policy` · `OnnxPolicy`) 안쪽과 정책별 되돌리기: **[ONNX 실행 구조](onnx-runtime.html)**

---

## 0. 한눈에 — 정책 하나가 쓰이려면 세 단계

| 단계 | 뜻 |
|---|---|
| **① 고르기** | 어떤 정책 파일을 쓸지 정함 (주인) |
| **② 불러오기** | 파일을 읽어 메모리에 올림 |
| **③ 실행** | 입력을 넣어 값(Δ · 속도 · 행동)을 뽑음 |

| 정책 | 파일 | ① 고르기 (주인) | ② 불러오기 | ③ 실행 | 계산기 |
|---|---|---|---|---|---|
| 팔 4개 — pick_standing_puck · place_cell · load_slot · unload_slot | `models/skills/<skill>/<skill>.onnx` | 각 팔 skill 노드 (**추론 안 함**) | `rl_arm_correction` (컨트롤러 플러그인) | `rl_arm_correction` 100 Hz 루프 안, 50 Hz마다 | `ml::Policy` → `OnnxPolicy` (CPU) |
| 도킹 4개 — dock_box · park_home · drive_straight · drive_arc | `models/skills/<skill>/<skill>.onnx` | `skill_approach` | `skill_approach` | `skill_approach` 20 Hz | `ml::Policy` → `OnnxPolicy` |
| Nav2 주행 | `models/rl_nav_controller/policy.onnx` (+ `.onnx.data`) | `RlNavController` (Nav2 플러그인) | 〃 | 〃 (경로 따라갈 때) | `OnnxPolicy` (CUDA 먼저 시도) |
| 순서 (plan_next) | `models/plan/plan_next.onnx` | `mission_manager` | 〃 | 〃 (BUILD 퍽 하나 끝날 때) | `ml::Policy` → `OnnxPolicy` |

> **되돌리기:** skill 정책은 `meta.yaml` `runtime: policy`면 같은 폴더의 `<skill>.policy`를 `MlpPolicy`로 · plan_next는 `plan.yaml` `plan_model`에 `.policy` 경로. `ml::Policy`가 **파일 확장자**로 계산기를 고름 — 아래 순서도에서 `Policy`가 `OnnxPolicy` 또는 `MlpPolicy`로 갈라짐.

---

## 1. 객체 관계 (팔 정책)

```mermaid
classDiagram
  class SkillNode {
    +load_model(skill) SkillModel
    -models_ : vector~SkillModel~
  }
  class PickSkill {
    -policy_ : SkillModel
    -arm_ : ArmIO
  }
  class SkillModel {
    +name, dir, kind, layout
    +policy : string  (.onnx 또는 .policy 절대 경로)
    +use : bool
    +meta : map
  }
  class ArmIO {
    +contact_step(SkillModel, plan, close) Step
    -ctx_pub_ : Publisher~SkillContext~
  }
  class SkillContext {
    <<message /skill_context>>
    run_id · skill · policy · layout
    phase · holding · residual_live
    q_above[5] · q_down[5]
  }
  class RlArmCorrection {
    <<ros2_control 컨트롤러 플러그인>>
    -cache_ : map~경로, Skill~
    -ctx_box_ : RealtimeThreadSafeBox~Ctx~
    -hand_box_ : RealtimeThreadSafeBox~HandRelative~
    -delta_[5] · corr_[5] · prev_act_[5]
    +policy_for(SkillContext) Skill
    +update_and_write_commands()
  }
  class Skill {
    layout : ArmLayout (Place 39 · Pick 41)
    policy : Policy
  }
  class Policy {
    +load(path, why) bool
    +act_into(x, y)
    inputs · outputs · runtime
  }
  class OnnxPolicy {
    ONNX Runtime 세션 · 미리 묶은 텐서
  }
  class MlpPolicy {
    텍스트 MLP (되돌릴 때)
  }
  SkillNode <|-- PickSkill
  PickSkill --> SkillModel : 시작 때 load_model("pick_standing_puck")
  PickSkill --> ArmIO
  ArmIO ..> SkillContext : 닿는 구간 시작 때 발행
  SkillContext ..> RlArmCorrection : 구독
  RlArmCorrection --> Skill : cache_ (경로별 한 번)
  Skill --> Policy
  Policy --> OnnxPolicy : .onnx (기본)
  Policy --> MlpPolicy : .policy
```

---

## 2. 팔 정책 — 시작할 때

```mermaid
sequenceDiagram
  autonumber
  participant B as colcon 빌드
  participant PS as PickSkill (skill_pick 노드)
  participant SN as SkillNode::load_model<br/>skill_node.cpp:98
  participant MH as load_skill_model<br/>model.hpp:50
  participant RC as RlArmCorrection<br/>rl_arm_correction.cpp
  B->>B: models/skills/<skill>/ → install/skills/share/skills/model/<skill>/
  PS->>SN: load_model("pick_standing_puck")  (pick_skill.cpp:22)
  SN->>MH: load_skill_model(model_dir, name)
  MH->>MH: meta.yaml 읽기 · runtime(기본 onnx) → <skill>.onnx 있나 (model.hpp:59)
  MH-->>SN: SkillModel{use = meta use && 파일 있음, policy = 절대 경로, layout = pick}
  SN-->>PS: policy_ (로그 "정책 pick_standing_puck: … 시뮬 100 %")
  Note over RC: controller_manager가 플러그인 로드 → on_configure
  RC->>RC: /skill_context · /hand_relative 구독 (:87-90) · 파라미터 (residual_rad 0.05 · max_delta 0.05 · policy_hz 50)
```

(place_skill.cpp:20 → `place_cell` · load_skill.cpp:17 → `load_slot` · unload_skill.cpp:18 → `unload_slot` · stand_skill.cpp:59 → `regrasp_after_stand`(use: false))

---

## 3. 팔 정책 — 집기 한 번 (닿는 구간)

**3-1. 구간 시작: 정책을 알려 주고 불러 둠**

```mermaid
sequenceDiagram
  autonumber
  participant CO as coordinator
  participant PS as PickSkill
  participant AIO as ArmIO
  participant RC as RlArmCorrection
  participant MP as Policy → OnnxPolicy
  CO->>PS: /skills/pick (퍽 id)
  PS->>PS: 파지 후보 · MoveIt 퍽 위 5 cm
  PS->>AIO: contact_step(policy_)
  AIO->>RC: /skill_context (정책 경로 · layout · q_above · q_down)
  RC->>RC: policy_for(메시지)
  alt 처음 받은 경로
    RC->>MP: load(경로)
    MP-->>RC: 세션 · 버퍼 만들고 메타데이터로 검산 → cache_ 저장
  end
  RC->>RC: ctx_box_에 넣음 (실시간 루프로)
```

| 번호 | 코드 | 내용 |
|---|---|---|
| 1 | `coordinator` → 🎬 `/skills/pick` | 목표 퍽 id · 모양 · tag |
| 2 | `pick_skill.cpp` | `/score_grasps` 파지 후보 → MoveIt으로 퍽 위 5 cm (pregrasp — 정책 없음) |
| 3 | `pick_skill.cpp:87` → `ArmIO::contact_step` | 닿는 구간 시작 |
| 4 | `arm_io.cpp:316-329` | `/skill_context` = {run_id+1 · skill · **policy = .onnx 절대 경로** (runtime: policy면 .policy) · layout = pick · phase · holding · residual_live · q_above · q_down}. 정책을 안 쓰면 policy = "" (:322) — **추론값은 없음** |
| 5 | `rl_arm_correction.cpp:87` → `:156 policy_for` | 구독 콜백 (실시간 루프 밖) |
| 6~7 | `:165` → `policy.hpp:16 Policy::load` → `onnx_policy.cpp:123 → :51 OnnxPolicy::load` | 처음 받은 경로만 읽음 · CPU 세션 · 입출력 버퍼·텐서 한 번 잡음 · 메타데이터 `bee_test_x/y`로 검산(:102) · 입력 41 · 출력 5 확인 → `cache_[경로]` |
| 8 | `ctx_box_.set(Ctx)` | 실시간 루프가 가져갈 상자에 넣음 |

**3-2. 100 Hz 제어 루프: 매 주기**

```mermaid
sequenceDiagram
  autonumber
  participant JTC as arm_controller
  participant HR as hand_relative
  participant RC as RlArmCorrection
  participant MP as Policy → OnnxPolicy
  participant HW as BeebotSystemHardware
  loop 100 Hz
    JTC->>RC: reference q_ref
    HR-->>RC: /hand_relative → hand_box_
    RC->>RC: ctx_box_ · hand_box_ 가져옴
    opt 0.02 s 지남 · 손 카메라 유효
      RC->>RC: arm_obs → 입력 41개
      RC->>MP: act_into(입력)
      MP-->>RC: a[5] → Δ = 0.05·a
    end
    RC->>HW: q_ref + 처짐 적분 + Δ + 앞먹임
  end
```

| 번호 | 코드 | 내용 |
|---|---|---|
| 1 | JTC → `rl_arm_correction/<joint>/position` | 궤적의 이번 주기 관절값 (IK + 보간, 시뮬과 같은 시간표: 내려가기 → 쥐기 → 들기) |
| 2 | `hand_relative` → `/hand_relative` | 퍽 − 손끝 x·y · 면 방향 · is_box (4 Hz 이하 — 다음 값 올 때까지 유지) |
| opt | `rl_arm_correction.cpp:243` | 조건: 0.02 s(50 Hz) 지남 · q_above·q_down 있음 · 손 카메라 값 유효하고 1 s 안 |
| 4 | `arm_obs.hpp` (Pick 41 / Place 39) | q−q_ref (5) · q_down−q_ref (5) · 0.1·qd (5) · q_ref−q_above (5) · 이전 행동 (5) · 단계 one-hot (6) · 진행 [s] (1) · 100·카메라 x·y (2) · [Pick만: 면 방향 · is_box (2)] · 10·처짐 적분 (5) |
| 5~6 | `:259` → `policy.hpp:24` → `onnx_policy.cpp:133 OnnxPolicy::act_into` | 입력을 미리 묶은 버퍼에 복사 → `Session::Run`(:138, 호출마다 입출력 버퍼 새로 안 잡음) → a[5] → −1..1로 자름 → `residual_live`면 Δ = 0.05·a (상한 0.05 rad). 추론 예외면 그 주기 a = 0 (Δ = 0) |
| 7 | `command_interfaces` → `BeebotSystemHardware::write` → OpenCR | 명령 = q_ref + 처짐 적분 + Δ + 중력 앞먹임 |

끝나면 `PickSkill` → coordinator: {success, reason} (잡기 판정).

**정책이 Δ를 바꾸지 않는 경우:** `/skill_context`의 policy가 빈 문자열(meta `use: false` 또는 파일 없음) · 손 카메라 값이 없거나 1초보다 오래됨 · `residual_live: false`(손을 열거나 닫은 뒤 — 마지막 Δ 유지).

---

## 4. 도킹 정책 — skill_approach (한 노드가 다 함)

```mermaid
sequenceDiagram
  autonumber
  participant CO as coordinator
  participant AS as ApproachSkill<br/>approach_skill.cpp
  participant MP as Policy ×4 (OnnxPolicy)
  participant TM as twist_mux → smoother → collision_monitor
  Note over AS: 시작 때 (:40-44): dock_box · park_home · drive_straight · drive_arc<br/>load_model → Policy.load (:40, 입력 13 · 출력 2 확인) → policies_[이름]
  CO->>AS: 🎬 /skills/approach {target = 정책 이름(기본 dock_box), pose x,y,yaw}
  AS->>AS: pol_ = &policies_[이름] (:71) · 50 ms 타이머 (:89)
  loop 20 Hz (tick_sim)
    AS->>AS: 기준 제어: 목표 쪽으로 돌기 → 옆 어긋남 고치며 직진(≤ 0.12 m/s) → 마지막 방향
    AS->>AS: residual() (:130): nav_obs → 입력 13개 (목표 dx·dy · 방향차 cos·sin · vx·vy·wz · 직전 명령 · 직전 행동 · 시간 비율 · 기울기)
    AS->>MP: net.act_into(obs, act) (:146)
    MP-->>AS: a[2] → Δv = 0.02·a0 (±0.05) · Δω = 0.1·a1
    AS->>TM: /cmd_vel_nav (v + Δv, w + Δω) (:181)
  end
  AS-->>CO: 도착 (meta tol_m · tol_deg · hold_s) 또는 approach_blocked
```

---

## 5. Nav2 주행 정책 — RlNavController (원래부터 ONNX)

```mermaid
sequenceDiagram
  autonumber
  participant CS as controller_server (Nav2)
  participant RN as RlNavController<br/>rl_nav_controller.cpp
  participant OP as OnnxPolicy<br/>onnx_policy.cpp
  participant IN as 안쪽 controller (DWB 기본)
  CS->>RN: configure (플러그인 로드)
  RN->>RN: load_model("rl_nav_controller/policy.onnx") (:108 → :191)
  RN->>OP: load(경로, gpu=true) (:207) — ONNX Runtime 세션 (CUDA EP 있으면 CUDA, 아니면 CPU · 지금 vendor는 CPU)
  OP-->>RN: 입력 375 · 출력 2 (경로점 5×2 + 가상 스캔 360 + 5)
  loop 경로를 따라갈 때마다 (computeVelocityCommands :492)
    alt 정책 없음 · 점구름 0.5 s 넘게 끊김
      RN->>IN: inner_->computeVelocityCommands (:513)
    else
      RN->>RN: 입력 375개 만들기 (경로점 · 기둥 카메라 점구름 → 360방향 거리 · 속도 · 자이로 · 직전 행동)
      RN->>OP: policy_.run(obs) (:550)
      OP-->>RN: a[2] → v = a0·0.26 · w = a1·1.82 (속도를 직접)
    end
    RN-->>CS: cmd_vel → /cmd_vel_nav
  end
```

---

## 6. 순서 정책 — plan_next (mission_manager)

```mermaid
sequenceDiagram
  autonumber
  participant MM as MissionManager<br/>mission_manager.cpp
  participant PN as PlanNext<br/>plan_next.hpp
  participant MP as Policy → OnnxPolicy
  MM->>PN: planner == plan_next일 때만 load(models/plan/plan_next.onnx) (:118 → :32, 입력 167 · 출력 97 확인)
  Note over MM: SURVEY 끝 → allocate → BUILD
  MM->>MM: build_pn_start (:405) — 퍽 12개 상태 · 목표 장소·칸 · 로봇 자리
  loop 퍽 하나 처리 끝날 때마다 (:466 → build_pn :492)
    MM->>PN: 지금 상태 (167)
    PN->>MP: act_into (:72) → 97개 점수 (tanh)
    PN-->>MM: 막힌 행동(조건 안 맞음 · 로봇에 없는 skill) 빼고 가장 높은 것 — 퍽 i × 행동 또는 복귀
    MM->>MM: 그 퍽 처리 (grab · go_near · unload/place · 확인) → 결과로 상태 고침
  end
```

---

## 7. #97 전과 다른 점

| | #97 전 (develop `3a6d668`) | #97 (이 페이지) |
|---|---|---|
| 정책 파일 | `<skill>.policy` (skill 폴더 `.onnx`는 가중치가 없어 못 여는 껍데기) | 가중치 포함 `<skill>.onnx` 기본 · `.policy`는 되돌리기용 |
| 계산기 | `MlpPolicy` (팔 · 도킹 · plan_next) · `OnnxPolicy` (Nav2만) | 모두 `ml::Policy` → 기본 `OnnxPolicy` (Nav2는 그대로 `OnnxPolicy`) |
| 고르는 곳 · 실행 위치 · 주기 | — | **같음** |

계산기 안쪽 · 시험 · 되돌리는 법: [ONNX 실행 구조](onnx-runtime.html)
