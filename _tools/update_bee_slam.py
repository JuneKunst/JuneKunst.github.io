"""Publish the maintained cuVSLAM/nvblox Archify artifact and matching contracts.
Usage: python3 _tools/update_bee_slam.py /absolute/path/to/maintained/archify/folder
The historical page/contracts remain unchanged; no robot code is modified.
"""
from pathlib import Path
import copy
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1] / 'bee'
BASE = Path(sys.argv[1]).resolve()
SOURCE = BASE / 'source-snapshot'
D = json.loads((BASE / 'full-candidate.json').read_text())
old_path = ROOT / '2026-10-28-contracts.json'
if not old_path.exists():
    shutil.copyfile(ROOT / 'contracts.json', old_path)
OLD = json.loads(old_path.read_text())
OLD_EDGES = {e['id']: e for e in OLD['edges']}
N = {n['id']: n for n in D['components']}
REV = D['meta']['repository']['revision']
P = 'lv2_module6/ros2_ws/src/'


def source(path, start, end):
    if not path.startswith('bringup/'):
        path = 'ros_system/' + path
    lines = (SOURCE / (P + path)).read_text().splitlines()
    assert 1 <= start <= end <= len(lines)
    return {'path': P + path, 'line': start, 'end_line': end,
            'excerpt': '\n'.join(f'{i+1}: {lines[i]}' for i in range(start-1, end)),
            'revision': REV}


def channel(name, typ, kind='topic', example=None, schema='', note='', sources=None):
    return {'name': name, 'type': typ, 'kind': kind, 'example': example,
            'schema': schema, 'note': note,
            'exampleLabel': '설명용 예시 · 실행 로그 아님' if example is not None else '실행 로그·payload 예시 미수록',
            'sources': sources or [source('launch/ros_system.launch.py', 267, 304)]}


def clone_channel(edge_id, index=0, **overrides):
    c = copy.deepcopy(OLD_EDGES[edge_id]['channels'][index])
    c.update(overrides)
    return c


launch = [source('launch/ros_system.launch.py', 267, 304)]
map_src = [source('scripts/nvblox_map.py', 18, 62)]
cuv_src = [source('scripts/cuvslam_slam.py', 178, 213)]
C = {}
# Camera RGB-D contracts remain illustrative, not observed sensor traffic.
C['s1'] = copy.deepcopy(OLD_EDGES['e12']['channels'])
for c in C['s1']:
    c['sources'] = [source('scripts/cuvslam_slam.py', 100, 116)]
C['s2'] = [clone_channel('e43', note='cuVSLAM은 영상 시각의 odom→base 변환을 읽어 map→odom을 계산합니다. 입력 방향은 이 설명을 따르며 기존 예시는 사용하지 않습니다.', example=None, sources=cuv_src)]
C['s3'] = [clone_channel('e43', note='cuVSLAM이 map→odom TF를 발행합니다. header 시각에 설정된 tolerance(그림 기준 +0.2초)를 더합니다. TF는 점유 지도가 아닙니다.', sources=cuv_src)]
C['s4'] = [clone_channel('e48', name='/cuvslam/odom', example=None,
    schema='nav_msgs/Odometry; header.frame_id=odom, child_frame_id=base_footprint; twist.twist와 twist.covariance',
    note='EKF odom1 입력. cuVSLAM 자세를 직접 융합하지 않고 선속도 x/y 및 각속도 z를 사용합니다. 재추적 시 자세 점프와 구분합니다.', sources=cuv_src)]
for edge_id, cam_edge in [('s5', 'e12'), ('e18', 'e13')]:
    channels = copy.deepcopy(OLD_EDGES[cam_edge]['channels'])
    C[edge_id] = [c for c in channels if 'aligned_depth' in c['name']]
    for c in C[edge_id]:
        c['sources'] = launch
        c['note'] += ' nvblox용 depth gate 입력입니다. 손목 경로는 스캔 자세에서만 통과합니다.'
for eid, cam in [('s6', 'pole_front_cam'), ('s7', 'gripper_cam')]:
    C[eid] = [channel(f'/{cam}/aligned_depth_to_color/image_nvblox', 'sensor_msgs/msg/Image',
        schema='Header header; height,width,encoding,step,data (깊이 영상)',
        note='원본 aligned depth에서 근거리(설정 0.5m 미만)를 0으로 만듭니다. 손목은 스캔 자세가 아니면 전체 depth를 비웁니다. camera_info는 카메라에서 nvblox로 별도 remap됩니다.')]
C['s8'] = [clone_channel('e43', example=None, sources=launch,
    note='nvblox는 영상 시각의 map→각 카메라 TF로 depth를 지도 좌표에 통합합니다. 개별 시각의 실제 변환값은 미수록입니다.')]
for eid in ['s9', 's13', 's14', 's15']:
    C[eid] = [clone_channel('e163', name='/nvblox_node/static_occupancy_grid' if eid == 's9' else '/map', sources=map_src,
        note='설명용 축소 격자입니다. nvblox_map은 새 격자만 /map으로 발행하며 /map QoS는 reliable + transient_local입니다. cuVSLAM 자체는 점유 격자를 만들지 않습니다.')]
C['s10'] = [channel('after_shutdown_map_save_path → nvblox.nvblx', 'nvblox map file', kind='file',
    note='매핑 모드에서 종료 시 저장하는 nvblox 지도 파일입니다. RTAB의 장소/관측 DB나 map.pgm/map.yaml과 동일한 파일이 아닙니다.', sources=launch)]
C['s11'] = [channel('load_path → nvblox.nvblx', 'launch parameter / file path', kind='file',
    note='saved 모드에서 nvblox_map에 전달하는 저장 지도 경로입니다. 파일을 불러오는 것만으로 전역 재위치추정을 보장하지 않습니다. 이 구현은 저장 당시와 같은 출발 위치·방향을 운영 전제로 둡니다.', sources=map_src)]
C['s12'] = [channel('/nvblox_node/load_map', 'nvblox_msgs/srv/FilePath', kind='service',
    example={'request': {'file_path': '/example/maps/nvblox.nvblx'}},
    schema='Request: string file_path; Response: success (사용한 필드)',
    note='경로는 형식 설명용입니다. 서비스 대기 또는 로드 실패는 로그로 남으며 구현상 빈 지도로 시작할 수 있습니다.', sources=map_src)]
C['s16'] = [channel('map:=slam|saved / launch restart', 'process / launch configuration', kind='reference',
    note='RTAB의 set_mode/load_database 서비스가 아닙니다. state_manager의 지도 모드 요청을 실행 경로의 재시작과 연결합니다.',
    sources=[source('bringup/launch/bringup.launch.py', 74, 118)])]

meaning = {
's1': ('전방 RGB-D로 시각 위치를 추정합니다.', '시각 위치 추정과 장애물 지도 생성을 분리합니다.', 'cuVSLAM RGB-D tracker가 프레임을 처리합니다.'),
's2': ('연속 odom 좌표를 SLAM 전역 보정과 연결합니다.', 'EKF의 연속 좌표와 SLAM의 전역 보정은 별도입니다.', '영상 시각의 odom→base TF를 조회합니다.'),
's3': ('SLAM 전역 위치 보정을 공유합니다.', 'TF와 2D 점유 지도를 구분합니다.', 'map→odom TF를 발행합니다.'),
's4': ('시각 이동 속도를 EKF에 제공합니다.', '재추적 자세 점프를 속도 융합과 분리합니다.', 'EKF가 odom1의 설정된 속도 성분을 융합합니다.'),
's5': ('전방 depth에서 근거리 자기 몸 오염을 줄입니다.', '인지 원본과 지도용 필터 입력을 분리합니다.', 'pole_depth_gate가 근거리 depth를 비웁니다.'),
's6': ('필터된 전방 depth를 지도에 통합합니다.', '입력 필터와 TSDF 재구성을 분리합니다.', 'nvblox camera_0에 depth를 전달합니다.'),
's7': ('유효한 손목 스캔 depth를 지도에 보완합니다.', '움직이는 팔의 불안정한 관측을 지도에 그대로 넣지 않습니다.', '스캔 자세의 depth만 camera_1에 통합합니다.'),
's8': ('깊이 관측을 map 좌표에 배치합니다.', '픽셀별 거리와 세계 좌표의 위치는 다릅니다.', '영상 시각의 카메라 TF로 통합합니다.'),
's9': ('nvblox 점유 격자를 ROS 지도 어댑터로 전달합니다.', '3D 지도 생성과 downstream QoS 호환을 분리합니다.', 'nvblox_map이 새 격자를 보관합니다.'),
's10': ('재사용할 nvblox 지도를 저장합니다.', '내부 지도 파일과 2D 지도 내보내기를 구분합니다.', '매핑 종료 시 파일에 저장합니다.'),
's11': ('저장 지도 경로를 로더에 전달합니다.', '설정 경로와 실제 load service를 분리합니다.', 'nvblox_map이 시작 시 로드를 요청합니다.'),
's12': ('nvblox에 저장 지도를 불러옵니다.', '파일 경로 전달과 GPU 지도 로드를 분리합니다.', 'FilePath 요청 결과를 로그로 기록합니다.'),
's13': ('Nav2 전역 계획의 정적 지도를 공급합니다.', '지도 생성과 costmap 합성을 분리합니다.', 'static_layer가 /map을 구독합니다.'),
's14': ('탐사에서 미지·자유·점유 셀을 판단합니다.', '위치 추정만으로는 프론티어를 고를 수 없습니다.', 'explorer가 /map으로 탐사 후보를 계산합니다.'),
's15': ('평면 지도를 PGM/YAML로 내보냅니다.', 'nvblox 내부 파일과 일반 2D 지도 파일은 다릅니다.', 'map_saver가 /map을 저장 요청에 사용합니다.'),
's16': ('매핑과 저장 지도 모드를 전환합니다.', '전역 모드 결정과 SLAM 프로세스 구성을 분리합니다.', 'map:=slam|saved 구성으로 실행 경로를 재시작합니다.'),
'e18': ('손목 depth를 지도용 게이트에 전달합니다.', '근접 인지 원본과 지도에 쓸 스캔을 분리합니다.', '자세·거리 조건을 확인해 nvblox 입력을 만듭니다.')}
EDGES = []
for e in D['connections']:
    if e['id'] in meaning:
        a, b, c = meaning[e['id']]
        item = {k: e[k] for k in ['id', 'from', 'to', 'label']}
        item.update(purpose=a, whySeparate=b, receiverDoes=c, status='implemented', channels=C[e['id']], sourceRevision=REV)
    else:
        item = copy.deepcopy(OLD_EDGES[e['id']])
        item.update({k: e[k] for k in ['from', 'to', 'label']})
        item['sourceRevision'] = OLD['revision']
        item['related'] = [x for x in item.get('related', []) if x in {c['id'] for c in D['connections']}]
    EDGES.append(item)

roles = {
'cuvslam': ('시각 SLAM 위치 추정', '전방 RGB-D로 map→odom과 Path를 계산하고 속도를 EKF에 제공합니다. 점유 지도 생성은 nvblox가 맡습니다.'),
'pgate': ('전방 지도용 depth 필터', '설정된 근거리 depth를 제거해 로봇 몸체가 지도에 남는 것을 줄입니다. 정밀 URDF body_filter와 같은 처리라고 보지 않습니다.'),
'gate': ('손목 지도용 depth·자세 게이트', '근거리 depth 제거에 더해 스캔 자세에서만 지도 관측을 통과시킵니다.'),
'nvblox': ('깊이 기반 TSDF·점유 지도 생성', '두 카메라 depth와 TF로 지도를 구성합니다. 위치 추정은 cuVSLAM/EKF와 분리합니다.'),
'nvbloxmap': ('2D 지도 QoS 어댑터·로드 요청', 'static_occupancy_grid를 reliable + transient_local /map으로 전달하고 저장 지도 load_map을 요청합니다.'),
'mapdb': ('nvblox 지도 저장 파일', 'nvblox.nvblx는 RTAB 장소 DB와 다릅니다. 로드가 자동 재위치추정을 보장하지 않으며 같은 출발 위치·방향이라는 운영 전제가 있습니다.'),
'ekf': ('바퀴·IMU·시각 속도의 연속 odom 융합', 'cuVSLAM /cuvslam/odom의 속도를 odom1로 사용하며 odom→base TF를 제공합니다.'),
'mapsaver': ('/map의 PGM/YAML 내보내기', '2D 점유 지도를 파일로 저장합니다. nvblox.nvblx 저장과 별도 기능입니다.')}
NODES = {}
for key, n in N.items():
    role, why = roles.get(key, (OLD['nodes'].get(key, {}).get('role', n.get('sublabel', '')), OLD['nodes'].get(key, {}).get('whySeparate', '')))
    NODES[key] = {'label': n['label'], 'role': role, 'whySeparate': why}
result = {**OLD, 'revision': REV, 'updated': '2026-10-30', 'sourceSnapshotDate': '2026-10-29',
          'sourceNote': 'SLAM paths use the maintained local snapshot. Unchanged contracts retain sourceRevision from the previous snapshot; neither is claimed as a team remote commit or live runtime capture.',
          'nodes': NODES, 'edges': EDGES}
(ROOT / 'contracts.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
shutil.copyfile(BASE / 'full-flow.html', ROOT / 'diagram.html')
m = json.loads((ROOT / 'manifest.json').read_text())
m.update(title=D['meta']['title'], updated='2026-10-30', components=len(NODES), connections=len(EDGES),
         evidence_snapshot=REV, source_branch='feature/isaac (SLAM files match maintained snapshot)',
         cuVSLAM='Implemented in source: RGB-D tracking, map→odom, /cuvslam/odom velocity to EKF. Not a fresh hardware test.',
         nvblox='Implemented in source: depth gates, TSDF/occupancy, latched /map adapter, save/load.',
         contract_explanations=len(EDGES), connections_with_illustrative_examples=sum(any(c['example'] is not None for c in e['channels']) for e in EDGES),
         artifact_sha256=hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest(),
         native_artifact_sha256=hashlib.sha256((ROOT/'diagram.html').read_bytes()).hexdigest(),
         contracts_sha256=hashlib.sha256((ROOT/'contracts.json').read_bytes()).hexdigest())
(ROOT / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'components': len(NODES), 'connections': len(EDGES), 'revision': REV}))
