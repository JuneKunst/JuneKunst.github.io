# BEE · 전체 흐름과 학습 지도

- 전체 연결도: https://junekunst.github.io/bee/
- 학습 지도: https://junekunst.github.io/bee/skills.html
- 순차 미션 학습: https://junekunst.github.io/bee/skills.html#mission-flow
- 메시지·역할 사전: https://junekunst.github.io/bee/messages.html
- **전체 지도 (학습부터 로봇까지, 상태 색 표시)**: https://junekunst.github.io/bee/system-map.html
- **11-03 정리 (결정 · 만든 것 · 결과 · 노드 · 남은 일)**: https://junekunst.github.io/bee/wrapup-1103.html
- 스킬·플랜 한 장 (설명용): https://junekunst.github.io/bee/skill-plan.html
- 학습용 skill 구성·학습 플랜 (결정 중): https://junekunst.github.io/bee/skill-learning.html
- skill별 학습 조건 (환경·보상·성공·기준선): https://junekunst.github.io/bee/skill-training.html

## 학습 순서

상단은 전체 구조 → 미션 진행 → 동작 실행으로 구성합니다.
mission_manager 내부는 미션 진행의 상세 보기, 세우기 설계는 동작 실행의 상세 보기입니다.
기존 다섯 HTML 주소와 이전 해시 링크를 유지합니다.

미션 진행과 동작 실행에는 이전·다음으로 따라가는 안내가 있습니다.
전체 미션 10단계, 퍽 하나 운반 8단계, load/unload 내부 각 6단계에서
입력·판단 주체·명령·완료 조건·실패 처리와 소스 링크를 확인합니다.
선택한 단계의 관련 노드를 다이어그램에서 강조합니다.

## 역할과 구현 경계

주사위 미션은 mission_manager → mission_solver(순수 규칙 함수) → coordinator 경로입니다.
vlm_task_planner·ai-service는 자연어/사람 계획을 위한 선택 경로이며 고정 미션의 필수 단계가 아닙니다.
ai-service의 human 화면은 planner의 POST /plan 요청에 사람이 응답하는 방식입니다.

URDF는 적재함 칸의 위치와 로봇 구조, basket.yaml은 팔의 관절 목표 자세,
BasketState는 현재 실린 퍽을 기록합니다. 자세표는 URDF 변경과 자동 동기화되지 않습니다.
누운 퍽은 stand → 인지로 섰는지 확인 → stand_pick으로 세워서 집습니다 (PR #48·#49, 실기 성공률은 미확인).
DONE은 미션 흐름 종료이며 모든 퍽의 성공을 뜻하지 않습니다.

## 출처

학습 다이어그램과 단계 안내: 팀 저장소 `92900a52a5b453f96dc83c3dc6ec6e7bee170632`
(PR #49, 팔 skill #48 포함). #45·#47·#50은 병합 완료입니다.
출처와 실제 검증 범위를 분리합니다. 이번 갱신은 로봇의 실기·시뮬레이션 성공 검증이 아닙니다.

전체 연결도의 cuVSLAM·nvblox·인지 구현은 기존 유지 스냅샷을 사용하며,
전체 연결도의 모든 근거를 학습 페이지의 새 커밋으로 일괄 바꾸지 않았습니다.
전체 연결 사전의 mission/state·SubGoal·그리퍼 설명은 최신 sourceRevision으로 구분합니다.
예시는 실제 전송 로그가 아닌 설명용이며 생략한 필드는 명시합니다.

## 보존과 재생성

기존 RTAB-Map 보존본: `2026-10-28.html`, `2026-10-28-contracts.json`.
이번 변경 전 학습 다이어그램: `archive/2026-11-02-before-learning/`의 다섯 HTML.
새 native candidate와 재생성 방법: `../_tools/bee-skills/README.md`.

생성 HTML은 직접 패치하지 않습니다. Archify finalize의 validate·deliver·check·browser-check를 거쳐 복사합니다.
host 탐색·순차 학습은 별도로 브라우저에서 검증합니다. 학습 UI에는 로봇 제어·실시간 ROS bridge가 없습니다.
