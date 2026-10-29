# BEE · 전체 흐름과 메시지·역할 설명

- 최신: https://junekunst.github.io/bee/
- 전체 연결 사전: https://junekunst.github.io/bee/messages.html
- 원본 native Archify: https://junekunst.github.io/bee/diagram.html
- 2026-10-28 최초 게시 보존본: https://junekunst.github.io/bee/2026-10-28.html

## 사용하는 법

노드를 선택하면 역할 분리 이유가 나타납니다. 각 연결 아래 **왜 나누었나 · 전송값 예시**를 펼치면 목적, 분리 이유, 수신 측 처리, topic/service/action 타입, 필드, 예시 값, 근거 코드를 볼 수 있습니다. 연결 행이나 직접 관계를 선택하면 해당 설명을 엽니다. 상단 사전에서 195개 연결을 검색할 수도 있습니다.

수치는 실제 로봇 로그가 아닌 코드 계약을 설명하기 위한 샘플입니다. 135개 연결에 예시를 제공합니다. 나머지 내부 함수·설정·대체·파일/프로세스 관계 또는 형식 미확인 항목은 값이 없다는 점을 표시하고 임의의 ROS payload를 만들지 않습니다. 표준 메시지의 일부 필드와 바이너리 배열을 생략한 곳은 명시합니다. 예정 cuVSLAM 경로는 현재 실행값이 아닙니다.

## 구현 경계

Archify 3.2.0으로 검증한 원본 diagram.html과 날짜별 보존본은 바이트가 같습니다. index.html은 원본 iframe을 담는 별도 host이며, inspector.js가 원본의 노드/연결 선택 패널에 설명을 덧붙입니다. contracts-ui.js는 안전한 DOM textContent로 내용을 렌더합니다. 원본 renderer/SDK/inline HTML을 수정하지 않았습니다. native 자동 검증은 원본에 대한 근거이고, 설명 확장은 별도 단위 테스트·실제 브라우저 상호작용으로 검증합니다.

contracts.json은 118개 구성 요소와 195개 연결을 같은 고정 ID로 매칭합니다. label이나 선 위치로 통신을 추측하지 않습니다. 문서형 설명과 스냅샷 코드 근거를 기록하며 실시간 ROS bridge나 로봇 제어 기능은 없습니다.

출처는 feature/mission-v5-sim 작업 트리의 별도 로컬 스냅샷 d4363b0c2b23a1ab58628ea91738bf1c2fd5f0c9입니다. 팀 원격 저장소에 있는 커밋으로 가장하지 않습니다. 일부 짧은 근거 코드만 설명 자료에 포함하며 전체 소스/Git 저장소/개인 설정은 배포하지 않습니다.

실제 rl_nav_tuner는 /local_costmap/costmap을 구독하는데 기존 전체도 e159는 global_costmap으로 이어집니다. 설명에 차이를 표시했습니다. 기존 배치·토폴로지를 바꾸지 않는 이번 확장의 범위와 구분합니다.

## 검증

```sh
python3 _test/test_bee_contracts.py
node --check bee/contracts-ui.js
node --check bee/inspector.js
node --check bee/catalog.js
```

업데이트 시 원본은 candidate에서 다시 생성·검증합니다. 새 설명은 contracts.json과 별도 host의 소스에서 수정합니다. 날짜별 원본은 보존합니다.
