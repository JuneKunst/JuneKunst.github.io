"""Apply perception PR #45 (12-blink signal, location_box/start_box) to the published BEE contracts.
Usage: python3 _tools/update_bee_perception.py /absolute/path/to/maintained/archify/folder
Edits only perception-related nodes/edges in bee/contracts.json; copies the finalized diagram.
"""
from pathlib import Path
import hashlib
import json
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1] / 'bee'
BASE = Path(sys.argv[1]).resolve()
SNAP = BASE / 'source-snapshot'
D = json.loads((BASE / 'full-candidate.json').read_text())
REV = D['meta']['repository']['revision']
C = json.loads((ROOT / 'contracts.json').read_text())
P = 'lv2_module6/ros2_ws/src/'


def src(path, a, b):
    lines = (SNAP / (P + path)).read_text().splitlines()
    assert 1 <= a <= b <= len(lines), path
    return {'path': P + path, 'line': a, 'end_line': b, 'revision': REV,
            'excerpt': '\n'.join(f'{i + 1}: {lines[i]}' for i in range(a - 1, b))}


LABEL = '설명용 예시 · 실행 로그 아님'
PLANNED = ' 수신 측 mission_manager는 아직 옛 메시지 기준이라 3번 작업(미션 흐름)에서 다시 짭니다 — 현재 실행값이 아닙니다.'
stamp = {'sec': 100, 'nanosec': 0}
ident = {'x': 0.0, 'y': 0.0, 'z': 0.0, 'w': 1.0}
cov = [0.0] * 36


def yawq(z, w):
    return {'x': 0.0, 'y': 0.0, 'z': z, 'w': w}


def obj(i, cls, xyz, q, size, color, details, cams=('pole_front_cam',), px=(612, 338), conf=0.95):
    return {'id': i, 'class_name': cls, 'confidence': conf,
            'pose': {'pose': {'position': dict(zip('xyz', xyz)), 'orientation': q}, 'covariance': cov},
            'size': dict(zip('xyz', size)), 'last_seen': stamp, 'cameras': list(cams), 'px': list(px),
            'color': color, 'details': [{'key': k, 'value': v} for k, v in details]}


TRACKED_EXAMPLE = {'header': {'stamp': stamp, 'frame_id': 'map'}, 'objects': [
    obj(17, 'puck', (1.20, -0.40, 0.095), yawq(0.383, 0.924), (0.05, 0.05, 0.05), 'red',
        [('posture', 'standing'), ('tag', '3'), ('shape', 'box'), ('yaw_period', '90'), ('distance', '1.264')],
        cams=('pole_front_cam', 'gripper_cam')),
    obj(21, 'location_box', (2.10, 0.60, 0.07), yawq(1.0, 0.0), (0.205, 0.205, 0.07), '',
        [('tag', '13'), ('yaw_period', '360')], px=(402, 300), conf=1.0),
    obj(22, 'start_box', (1.20, -0.40, 0.07), yawq(0.0, 1.0), (0.21, 0.20, 0.07), '',
        [('yaw_period', '90')], px=(600, 360), conf=1.0)]}
TRACKED_SCHEMA = '\n'.join(l.split(': ', 1)[1] for l in (
    src('perception/msg/TrackedObjectArray.msg', 1, 2)['excerpt'].splitlines()
    + ['0: '] + ['0: # TrackedObject'] + src('perception/msg/TrackedObject.msg', 1, 10)['excerpt'].splitlines()))
TRACKED_SOURCES = [src('perception/msg/TrackedObjectArray.msg', 1, 2), src('perception/msg/TrackedObject.msg', 1, 10),
                   src('perception/scripts/perception_node.py', 904, 958)]
TRACKED_NOTE = ('id=17은 추적 번호이고 tag=3은 퍽의 AprilTag 번호(색과 무관한 무작위)입니다. puck은 yaw를 구하면 orientation에 넣고 '
                'shape·yaw_period를 details로 줍니다. location_box(L1~L3 놓는 상자)·start_box(퍽이 처음 있던 상자)의 위치는 상자 윗면 가운데, '
                'size는 잰 가로·세로·높이입니다. 태그만 보이고 윗면을 못 찾으면 location_box는 태그에서 상자 안쪽으로 반 변 옮긴 곳(기본 크기)입니다. '
                '좌표와 공분산 0은 설명용입니다.')

SEQ = ['red', 'green', 'red', 'red', 'green', 'red', 'green', 'green', 'yellow', 'green', 'yellow', 'green']
LET = {'red': 'R', 'yellow': 'Y', 'green': 'G'}


def signal(ok, error, cycles):
    return {'header': {'stamp': {'sec': 154, 'nanosec': 0}, 'frame_id': ''}, 'sequence': SEQ,
            'red': SEQ.count('red'), 'yellow': SEQ.count('yellow'), 'green': SEQ.count('green'),
            'ok': ok, 'error': error, 'cycles': cycles, 'raw': ' '.join(LET[c] for c in SEQ),
            'color': '', 'count': 0, 'sum': 0, 'dest_tag': 0}


SIGNAL_SCHEMA = '\n'.join(l.split(': ', 1)[1] for l in src('perception/msg/MissionSignal.msg', 6, 19)['excerpt'].splitlines())
SIGNAL_SOURCES = [src('perception/msg/MissionSignal.msg', 2, 19), src('perception/src/signal_decoder.cpp', 65, 101),
                  src('perception/src/signal_decoder.cpp', 109, 136)]

E = {e['id']: e for e in C['edges']}
for e in C['edges']:
    for c in e['channels']:
        if c['name'] == '/tracked_objects':
            c.update(schema=TRACKED_SCHEMA, example=TRACKED_EXAMPLE, note=TRACKED_NOTE, sources=TRACKED_SOURCES, exampleLabel=LABEL)
            e['sourceRevision'] = REV

e = E['e14']
e['receiverDoes'] = 'traffic_light의 color(red|yellow|green|off|all)를 시간순으로 읽어 켜진 구간 하나를 점멸 1번으로 셉니다.'
E['e14']['channels'][0]['note'] = '신호등 줄만 씁니다. ' + TRACKED_NOTE

mf = E['mission-facts']
mf['status'] = 'planned'
mf['purpose'] = '바코드 작업 지시와 퍽·상자의 모양·색·위치를 미션에 제공합니다.'
mf['receiverDoes'] = '퍽을 신호 그룹에 배정하고 location_box(L1~L3)를 목적지로 고릅니다.'
mf['channels'][0]['note'] = TRACKED_NOTE + PLANNED
mf['channels'][1].update(name='/mission/qr', example={'data': 'P2-01'},
    note='바코드·QR 작업 지시 문자열(reliable + transient_local). 같은 내용은 10초 넘게 안 보였다 다시 읽힐 때만 다시 냅니다. 이전 그림의 /mission/barcode가 아닙니다.' + PLANNED,
    sources=[src('perception/scripts/perception_node.py', 740, 746), src('perception/scripts/perception_node.py', 1221, 1256)])
mf['sourceRevision'] = REV

ms = E['mission-signal']
ms.update(status='planned', purpose='신호등 12회 점멸의 확정 답(순서·색별 횟수)을 미션 규칙 판단에 넘깁니다.',
          whySeparate='점멸 세기·검증은 센서 사실, 그룹 나누기·L1~L3 배정·정렬은 계획 판단입니다.',
          receiverDoes='ok=true인 sequence와 R·Y·G 횟수로 퍽 그룹·목적지·순서를 정합니다.', sourceRevision=REV)
ms['channels'] = [{'name': '/mission/signal', 'kind': 'topic', 'type': 'perception/msg/MissionSignal',
    'example': signal(True, '', 2), 'schema': SIGNAL_SCHEMA, 'exampleLabel': LABEL, 'sources': SIGNAL_SOURCES,
    'note': ('reliable + transient_local. 두 사이클 연속 같은 답일 때 새 답마다 한 번만 냅니다(첫 확정까지 약 1분). '
             'R=빨간 퍽 그룹, G=초록 퍽 그룹, Y=한 모양으로 통일한 퍽 그룹. color·count·sum·dest_tag는 옛 3단계 칸으로 값을 채우지 않습니다.' + PLANNED)}]

C['edges'] = [x for x in C['edges'] if x['id'] not in ('mission-reset', 'signal-status')]
C['edges'].append({'id': 'signal-status', 'from': 'signal', 'to': 'mission', 'label': 'signal_status',
    'purpose': '사이클마다 읽은 결과를 오류 이유와 함께 알립니다.',
    'whySeparate': '"아직 확정 전"과 "읽기 실패"를 구분해야 대기할지 안전 정지할지 정할 수 있습니다.',
    'receiverDoes': 'unconfirmed면 기다리고, unknown·range·count가 이어지면 오류 기록과 정지로 처리합니다.',
    'status': 'planned', 'sourceRevision': REV, 'related': ['mission-signal'],
    'channels': [{'name': '/mission/signal_status', 'kind': 'topic', 'type': 'perception/msg/MissionSignal',
        'example': signal(False, 'unconfirmed', 1), 'schema': SIGNAL_SCHEMA, 'exampleLabel': LABEL, 'sources': SIGNAL_SOURCES,
        'note': ('reliable(래치 없음). 사이클(12번 점멸 + 3초 꺼짐)이 끝날 때마다 냅니다. error = count(12개 아님) | unknown(모르는 색) | '
                 'range(색별 1~6회 벗어남) | unconfirmed(아직 2사이클 못 봄).' + PLANNED)}]})

N = C['nodes']
N['perception'].update(role='센서로 관측한 사실을 구조화 (퍽·상자·신호등·바코드)',
    whySeparate='물체 ID·종류·색·모양·방향·위치와 상자 윗면을 발행합니다. 무엇을 옮길지 같은 미션 판단과 모터 실행은 다른 계층입니다.')
N['signal'].update(role='12회 점멸 관측기 (2사이클 확정)',
    whySeparate='한 프레임의 신호등 색과 12회 순서·횟수 누적은 다릅니다. 순서·횟수와 오류 이유만 내고 그룹·배정·정렬은 계획 계층에서 합니다.')
N['markers'].update(label='태그·퍽·상자 판정', role='AprilTag·퍽 모양/yaw·상자 윗면(depth)',
    whySeparate='퍽 번호·모양·방향과, 바닥 위 약 7cm 상자 윗면을 찾아 장소 태그(12~14)가 붙으면 location_box, 아니면 start_box로 만듭니다.')
N['weights'].update(role='bee_yolo11n_v3.pt — 빨강·초록 퍽 × 사각·원기둥, 신호등 상태 4, person, obstacle')
for k, n in N.items():
    if k in {c['id'] for c in D['components']}:
        n['label'] = next(c['label'] for c in D['components'] if c['id'] == k)

assert {e['id'] for e in C['edges']} == {e['id'] for e in D['connections']}
C.update(revision=REV, updated='2026-11-02',
         sourceNote='Perception paths use the local snapshot with visualkhh/Lv2_bee_Assignment PR #45 perception package; '
                    'SLAM paths as before. Unchanged contracts retain their earlier sourceRevision; none is a team remote commit or live capture.')
(ROOT / 'contracts.json').write_text(json.dumps(C, ensure_ascii=False, indent=2) + '\n')
shutil.copyfile(BASE / 'full-flow.html', ROOT / 'diagram.html')
m = json.loads((ROOT / 'manifest.json').read_text())
m.update(title=D['meta']['title'], updated='2026-11-02', components=len(N), connections=len(C['edges']),
         evidence_snapshot=REV, perception='PR #45 (feature/perception): 12-blink signal + signal_status, location_box/start_box, puck shape/yaw. Not merged; not a hardware test.',
         contract_explanations=len(C['edges']),
         connections_with_illustrative_examples=sum(any(c['example'] is not None for c in e['channels']) for e in C['edges']),
         artifact_sha256=hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest(),
         native_artifact_sha256=hashlib.sha256((ROOT / 'diagram.html').read_bytes()).hexdigest(),
         contracts_sha256=hashlib.sha256((ROOT / 'contracts.json').read_bytes()).hexdigest())
(ROOT / 'manifest.json').write_text(json.dumps(m, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'components': len(N), 'connections': len(C['edges']), 'revision': REV}))
