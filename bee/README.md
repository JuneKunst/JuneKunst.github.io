# BEE · 전체 흐름과 메시지·역할 설명

- 최신: https://junekunst.github.io/bee/
- 전체 연결 사전: https://junekunst.github.io/bee/messages.html
- native Archify: https://junekunst.github.io/bee/diagram.html
- 최초 게시 보존본(RTAB-Map): https://junekunst.github.io/bee/2026-10-28.html

## cuVSLAM + nvblox 반영

현재 그림은 114개 구성 요소와 188개 연결입니다. RTAB-Map 및 cuVSLAM ‘적용 예정’ 경로 대신 다음 구현을 표시합니다.

- 전방 RGB-D → cuvslam_slam → map→odom TF, /cuvslam/odom의 속도 → EKF.
- 전방 pole_depth_gate와 손목 gripper_depth_gate → nvblox_node → static_occupancy_grid → nvblox_map → reliable + transient_local /map.
- /map → Nav2 global_costmap, explorer, map_saver.
- 매핑 종료 시 nvblox.nvblx 저장, saved 모드에서 load_map 요청. 지도 모드 전환은 실행 경로 재시작으로 표현합니다.
- 저장 지도 로드는 자동 재위치추정의 증거가 아닙니다. 이 구현은 저장할 때와 같은 출발 위치·방향을 전제로 합니다.

## 사용하는 법

노드를 선택하면 역할 분리 이유가 나타납니다. 각 연결의 ‘왜 나누었나 · 전송값 예시’를 펼치면 목적, 수신 측 처리, 타입, 필드와 근거 코드를 볼 수 있습니다. 메시지 사전에서는 전체 연결을 검색할 수 있습니다.

예시는 실제 로봇 로그가 아닌 설명용입니다. 확인하지 않은 payload는 만들지 않으며 일부 필드·바이너리 생략 여부를 표시합니다. ‘현재 코드 경로’는 구현 근거이며 이번 작업에서 실물 SLAM을 시험했다는 뜻이 아닙니다.

## 출처와 구현 경계

유지 관리 중인 `.archify/workflow-bee-current-20261028-192136/full-candidate.json`에서 그림을 생성합니다. SLAM 출처는 별도 로컬 스냅샷 `8cfe425a507d1fe593bcf1eda4defdb21d73f23f`입니다. 해당 launch·cuVSLAM·nvblox_map·nvblox/ekf 설정 파일은 확인 시점 feature/isaac HEAD `95fa8ecbd4b6ccfa178f1a55aa3dfbc783c29a9e`와 바이트가 같습니다. 스냅샷을 팀 원격 커밋으로 가장하지 않습니다.

변경하지 않은 메시지 설명은 기존 `d4363b0c2b23a1ab58628ea91738bf1c2fd5f0c9` 출처를 유지하며 각 연결의 sourceRevision으로 구분합니다. 전체 소스/Git 저장소/개인 설정은 배포하지 않습니다.

index.html은 원본 Archify를 iframe으로 담는 host입니다. inspector.js와 contracts-ui.js가 노드·연결 설명을 덧붙입니다. 생성된 renderer HTML은 직접 수정하지 않습니다. 날짜별 RTAB 보존본과 당시 contracts는 그대로 유지합니다.

## 검증·재생성

```sh
python3 _tools/update_bee_slam.py /absolute/path/to/maintained/archify/folder
python3 _test/test_bee_contracts.py
node --check bee/contracts-ui.js
node --check bee/inspector.js
node --check bee/catalog.js
```

먼저 Archify candidate를 source-snapshot 기준으로 finalize architecture하여 validate/deliver/check/browser-check를 통과시킨 뒤 게시 스크립트를 실행합니다. 계약 사전 검증과 실제 host 브라우저 검증은 native Archify 검사와 별도로 수행합니다. 실시간 ROS bridge나 로봇 제어 기능은 없습니다.
