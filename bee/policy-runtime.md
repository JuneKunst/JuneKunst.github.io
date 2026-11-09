# 정책은 어떤 코드가 어떤 순서로 실행하나 (11-09 develop)

> develop `a6e5072` 코드 기준. 파일 경로는 `lv2_module6/ros2_ws/src/` 기준, `파일:줄`은 그 시점 줄 번호.
> 관련: [팔 정책은 어디서 도나 — 두 방식 비교](policy-path.html) · [지금 구조 — 노드 · 플러그인](system-now.html) · [문제 풀이 흐름](mission-solve.html)
> **⚠️ 11-09: 모든 정책을 ONNX로 실행하도록 바꾸는 작업 진행 중** — 아래는 바꾸기 전(지금 develop) 구조. 바뀌면 이 페이지를 고침.

---

## 0. 한눈에 — 정책 하나가 쓰이려면 세 단계

| 단계 | 뜻 |
|---|---|
| **① 고르기** | 어떤 정책 파일을 쓸지 정함 (주인) |
| **② 불러오기** | 파일을 읽어 메모리에 올림 |
| **③ 실행** | 입력을 넣어 값(Δ · 속도 · 행동)을 뽑음 |

| 정책 | 파일 | ① 고르기 (주인) | ② 불러오기 | ③ 실행 | 계산기 |
|---|---|---|---|---|---|
| 팔 4개 — pick_standing_puck · place_cell · load_slot · unload_slot | `models/skills/<skill>/<skill>.policy` | 각 팔 skill 노드 | `rl_arm_correction` (컨트롤러 플러그인) | `rl_arm_correction` 100 Hz 루프 안, 50 Hz마다 | `MlpPolicy` (C++) |
| 도킹 4개 — dock_box · park_home · drive_straight · drive_arc | `models/skills/<skill>/<skill>.policy` | `skill_approach` | `skill_approach` | `skill_approach` 20 Hz | `MlpPolicy` |
| Nav2 주행 | `models/rl_nav_controller/policy.onnx` | `RlNavController` (Nav2 플러그인) | 〃 | 〃 (경로 따라갈 때) | `OnnxPolicy` (ONNX Runtime) |
| 순서 (plan_next) | `models/plan/plan_next.policy` | `mission_manager` | 〃 | 〃 (BUILD 퍽 하나 끝날 때) | `MlpPolicy` |

> skill 폴더의 `<skill>.onnx`는 **아무도 읽지 않는 보관용** — 그리고 가중치 파일(`.onnx.data`)이 레포에 없어 열리지도 않음 (11-09 확인).

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
    +policy : string  (.policy 절대 경로)
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
    policy : MlpPolicy
  }
  class MlpPolicy {
    +load(path) bool
    +act_into(x, y)
    obs_dim · act_dim
  }
  SkillNode <|-- PickSkill
  PickSkill --> SkillModel : 시작 때 load_model("pick_standing_puck")
  PickSkill --> ArmIO
  ArmIO ..> SkillContext : 닿는 구간 시작 때 발행
  SkillContext ..> RlArmCorrection : 구독
  RlArmCorrection --> Skill : cache_ (경로별 한 번)
  Skill --> MlpPolicy
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
  MH->>MH: meta.yaml 읽기 · <skill>.policy 있나 (model.hpp:59)
  MH-->>SN: SkillModel{use = meta use && 파일 있음, policy = 절대 경로, layout = pick}
  SN-->>PS: policy_ (로그 "정책 pick_standing_puck: … 시뮬 100 %")
  Note over RC: controller_manager가 플러그인 로드 → on_configure
  RC->>RC: /skill_context · /hand_relative 구독 (:87-90) · 파라미터 (residual_rad 0.05 · max_delta 0.05 · policy_hz 50)
```

(place_skill.cpp:20 → `place_cell` · load_skill.cpp:17 → `load_slot` · unload_skill.cpp:18 → `unload_slot` · stand_skill.cpp:59 → `regrasp_after_stand`(use: false))

---

## 3. 팔 정책 — 집기 한 번 (닿는 구간)

```mermaid
sequenceDiagram
  autonumber
  participant CO as coordinator
  participant PS as PickSkill<br/>pick_skill.cpp
  participant AIO as ArmIO<br/>arm_io.cpp
  participant JTC as arm_controller (JTC)
  participant RC as RlArmCorrection<br/>(controller_manager 안)
  participant MP as MlpPolicy<br/>mlp_policy.hpp
  participant HR as hand_relative 노드
  participant HW as BeebotSystemHardware → OpenCR
  CO->>PS: 🎬 /skills/pick {target id, shape, tag}
  PS->>PS: 파지 후보 (/score_grasps) · MoveIt으로 퍽 위 5 cm (pregrasp — 정책 없음)
  PS->>AIO: contact_step(policy_, plan(q_above, q_down), close) (pick_skill.cpp:87)
  AIO->>HR: /hand_relative/target {kind: puck, id}
  AIO->>RC: /skill_context {run_id+1, skill, policy=경로, layout=pick, phase, q_above, q_down} (arm_io.cpp:317-329)
  RC->>RC: 구독 콜백 (:88) → policy_for (:156)
  alt 이 경로를 처음 받음
    RC->>MP: Skill.policy.load(경로) (:165)
    MP->>MP: 가중치 읽기 · 파일 안 test 값으로 검산 (:19)
    MP-->>RC: 성공 → cache_[경로] 저장 (입력 41 · 출력 5 확인)
  end
  RC->>RC: ctx_box_.set(Ctx{메시지, Skill}) — 실시간 루프로 넘김
  AIO->>JTC: 궤적 (IK + 보간: 내려가기 → 쥐기 → 들기, 시뮬과 같은 시간표)
  loop controller_manager 100 Hz (update)
    JTC->>RC: reference = 계획 관절 q_ref
    HR-->>RC: /hand_relative (퍽 − 손끝 x·y, 면 방향, 4 Hz 이하) → hand_box_
    RC->>RC: ctx_box_ · hand_box_ 가져오기 · since_policy_ += dt
    opt 0.02 s 지남 && q_above·q_down 있음 && 손 카메라 값 유효(1 s 안) (:242)
      RC->>RC: arm_obs(Pick) → 입력 41개 (q−q_ref · q_down−q_ref · 0.1·qd · q_ref−q_above · 이전 행동 · 단계 · 진행 · 100·카메라 · 면 방향 · is_box · 10·처짐 적분)
      RC->>MP: act_into(obs, act) (:257)
      MP-->>RC: a[5] → clamp −1..1 → Δ = 0.05·a (residual_live일 때)
    end
    RC->>HW: command = q_ref + 처짐 적분 + Δ + 중력 앞먹임
  end
  PS-->>CO: 결과 {success, reason} (잡기 판정)
```

**정책이 Δ를 바꾸지 않는 경우:** `/skill_context`의 policy가 빈 문자열(meta `use: false` 또는 파일 없음) · 손 카메라 값이 없거나 1초보다 오래됨 · `residual_live: false`(손을 열거나 닫은 뒤 — 마지막 Δ 유지).

---

## 4. 도킹 정책 — skill_approach (한 노드가 다 함)

```mermaid
sequenceDiagram
  autonumber
  participant CO as coordinator
  participant AS as ApproachSkill<br/>approach_skill.cpp
  participant MP as MlpPolicy ×4
  participant TM as twist_mux → smoother → collision_monitor
  Note over AS: 시작 때 (:40-44): dock_box · park_home · drive_straight · drive_arc<br/>load_model → MlpPolicy.load (입력 13 · 출력 2 확인) → policies_[이름]
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

## 5. Nav2 주행 정책 — RlNavController (유일하게 ONNX)

```mermaid
sequenceDiagram
  autonumber
  participant CS as controller_server (Nav2)
  participant RN as RlNavController<br/>rl_nav_controller.cpp
  participant OP as OnnxPolicy<br/>onnx_policy.cpp
  participant IN as 안쪽 controller (DWB 기본)
  CS->>RN: configure (플러그인 로드)
  RN->>RN: load_model("rl_nav_controller/policy.onnx") (:108 → :191)
  RN->>OP: load(경로) (:207) — ONNX Runtime 세션 (CUDA 있으면 CUDA, 아니면 CPU)
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
  participant MP as MlpPolicy
  MM->>PN: planner == plan_next일 때만 load(models/plan/plan_next.policy) (:118 → :32, 입력 167 확인)
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

## 7. ONNX 전환 (11-09 진행 중)

| 바꾸는 곳 | 지금 | 바꾼 뒤 |
|---|---|---|
| 정책 파일 | `<skill>.policy` (텍스트) · `.onnx`는 가중치 없는 껍데기 | **가중치를 품은 단일 `<skill>.onnx`** — 지금 `.policy`의 가중치를 그대로 옮겨 만듦 (출력 같음 확인) |
| 계산기 | `MlpPolicy` (C++ 직접) | `OnnxPolicy` (ONNX Runtime) — 제어 루프용은 **CPU 고정 · 미리 잡은 버퍼** |
| 팔 · 도킹 · plan_next | 위 2~6절 경로 그대로 | 경로 그대로, 파일과 계산기만 바뀜 |
| 필요 설치 | 없음 | 로봇 · PC에 ONNX Runtime (`ros-lyrical-onnxruntime-vendor`) — 없으면 정책 꺼지고 기준 동작 |
