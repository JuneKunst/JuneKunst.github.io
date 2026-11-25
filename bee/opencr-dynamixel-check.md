# OpenCR과 DYNAMIXEL Wizard로 바퀴·매니퓰레이터 점검

2026-11-25

바퀴 모터 두 개의 ID를 확인하려고 DYNAMIXEL Wizard 2.0으로 검색했는데 처음에는 장치가 0개로 나왔다. OpenCR의 USB 연결부터 확인하고, 바퀴가 응답한 뒤에는 매니퓰레이터에서 빠진 ID를 따로 조회했다.

## USB 연결과 중계 펌웨어

처음에는 OpenCR이 USB 목록에서 사라져 있었고, 커널 로그에는 연결이 끊긴 기록이 남아 있었다. 복구 모드에 들어갔을 가능성도 생각했지만 당시 USB 목록만으로는 확인할 수 없었다. OpenCR을 PC에 직접 연결하니 `OpenCR Virtual ComPort`가 나타났고 `/dev/ttyACM0`도 열렸다.

Wizard에서 PC와 모터 사이의 패킷을 전달할 수 있도록 ROBOTIS의 `usb_to_dxl` 예제를 빌드해 OpenCR에 올렸다. 업로더에서 `CRC OK`와 `[OK] Download`를 확인했고, 재부팅한 뒤에도 `/dev/ttyACM0`가 다시 잡혔다. 재업로드 전에 어떤 펌웨어가 실행 중이었는지는 확인하지 못했다. 이전에 같은 펌웨어를 올렸다면 이번 재업로드가 필요했는지는 알 수 없다.

검색 중 OpenCR의 USER2가 주황색으로 깜빡였다. `usb_to_dxl` 코드에서 USER2는 모터 버스 송신, USER1은 수신을 나타낸다. USER2가 깜빡여도 모터 응답은 검색 결과나 PING으로 확인해야 한다.

## 외부 전원 재연결 후 바퀴 응답 확인

중계 펌웨어를 올린 직후에도 Wizard 검색 결과는 0개였다. Wizard를 거치지 않고 시리얼 포트에서 직접 PING을 보내도 응답이 없었다. 모터 외부 전원을 다시 연결한 뒤 동일한 포트에서 PING을 재시도하니 두 바퀴가 모두 응답했다. 이후 Wizard에서도 ID 1과 2를 확인했다.

| 구분 | 응답한 ID | 모델 번호 | 펌웨어 버전 |
| --- | --- | --- | --- |
| 바퀴 | 1, 2 | 1030 | 50 |
| 매니퓰레이터 | 13, 14, 15 | 1020 | 50 |

모두 Protocol 2.0, 1 Mbps에서 확인했다. 바퀴 두 개는 이미 ID가 달랐기 때문에 초기화나 ID 변경 없이 확인을 마쳤다. 외부 전원 재연결 뒤 응답이 돌아왔지만, 전원이 공급되지 않았던 정확한 원인은 확인하지 못했다.

## 매니퓰레이터에서 빠진 ID 11·12

Wizard를 닫아 포트를 비운 뒤 ID 11과 12를 개별 PING했다. 1 Mbps를 포함한 8개 속도에서 두 ID의 응답이 없었다. 같은 포트와 버스에서 ID 13·14·15는 응답했다. 11·12로 예상한 모터의 실제 ID와 배선 상태는 아직 확인하지 않았다.

다시 점검할 때는 다음 순서로 진행한다.

1. Wizard의 검색 설정에서 `ttyACM0`, Protocol 2.0, `1,000,000 bps`, ID `1–252`를 선택하고 조회 결과를 기록한다.
2. `도구 → ID 검사(ID Inspection)`에서 같은 포트와 속도로 중복 ID를 확인한다.
3. 외부 전원을 끄고, 11번으로 사용할 실제 관절 모터 한 개를 응답이 확인된 케이블과 포트에 직접 연결한다. 전원을 켜고 일반 검색으로 현재 ID를 확인한다. 12번 관절에도 같은 절차를 적용한다.
4. 단독으로 찾은 ID를 변경해야 한다면 컨트롤 테이블에서 `Torque Enable = 0`을 확인한 뒤 `ID`를 변경하고 다시 검색한다. 단독 검색에서도 응답이 없으면 전원과 케이블부터 확인한다.
5. 전원을 끄고 전체 배선을 복원한 뒤 다시 검색해 바퀴 1·2와 이번 점검 대상인 팔 11–15의 응답을 확인한다.

이번 작업에서는 모터의 ID나 설정을 변경하지 않았다. 실제 주행이나 관절 제어를 재개할 때는 OpenCR에 해당 제어 펌웨어를 다시 올려야 한다.

## PC에서 라즈베리 파이 SSH 접속까지
Wi-Fi 설정을 다시 잡아야 하거나 IP를 찾을 수 없다면 [라즈베리 파이 Wi-Fi 연결과 SSH 복구](../reference/raspberry-pi-wifi-ssh.html)를 따라간다.

먼저 PC 터미널에서 OpenCR이 잡히는지 확인한다. 아래 명령에서 시리얼 포트 번호는 연결할 때 달라질 수 있다.

```bash
lsusb
ls -l /dev/serial/by-id/
journalctl -k -b --no-pager | grep -Ei 'opencr|ttyACM' | tail -20
```

Wizard 점검을 마치면 앱을 닫는다. 라즈베리 파이에서 OpenCR을 사용할 때는 OpenCR USB를 파이에 연결한다. PC와 파이가 같은 네트워크에 있는지 확인한 뒤, PC에서 아래 순서로 실행한다.

```bash
# 실제 라즈베리 파이의 호스트명과 계정명으로 바꾼다.
PI_HOST='raspberrypi.local'
PI_USER='your-user'

getent hosts "$PI_HOST"
ssh -o ConnectTimeout=5 "$PI_USER@$PI_HOST"
```

`.local` 이름이 조회되지 않으면 라즈베리 파이 자체 터미널에서 `hostname -I`를 실행해 LAN IP를 확인한다. PC에서 `PI_HOST`에 그 IP를 넣고 같은 SSH 명령을 다시 실행한다.

접속 후에는 아래 명령으로 로그인한 장비와 OpenCR 포트를 확인한다.

```bash
hostname
whoami
lsusb
ls -l /dev/serial/by-id/
```

- [ROBOTIS OpenCR 연결 가이드](https://emanual.robotis.com/docs/en/software/dynamixel/dynamixel_workbench/#opencr)
- [DYNAMIXEL Wizard 2.0 검색 및 ID 검사](https://emanual.robotis.com/docs/en/software/dynamixel/dynamixel_wizard2/#id-inspection)

## 제어 펌웨어 복원과 Raspberry Pi 배포
재현할 때는 [TurtleBot3와 OpenCR 실물 기동 가이드](../reference/turtlebot3-opencr-bringup.html)의 준비, 보정, 검증 순서를 참고한다.

Wizard에서 매니퓰레이터의 실제 ID를 다시 확인했다. 팔은 베이스 쪽부터 11, 12, 13, 14이고, **15번 모터 하나가 그리퍼 양쪽 핑거를 함께 구동**한다. Wizard에서 11번과 15번은 Extended Position, 12–14번은 Position 모드로 설정했다. 확인한 제어 펌웨어 소스에는 초기화 때 모드 레지스터를 덮어쓰는 코드가 없었다. 실제 보드에서 부팅 전후의 모드 레지스터를 대조하는 검증은 남아 있다.

OpenCR에 ROS 2용 `turtlebot3_manipulation.opencr`을 다시 올렸다. 업로더의 CRC 일치와 `jump_to_fw`, USB 포트 재인식, OpenCR 제어 테이블 응답을 확인했다. ROBOTIS 배포 파일은 이름이 `.tar.bz2`였지만 실제로는 gzip이었다. Linux에서 `file`로 확인하고 `tar -xf`로 풀었다. 이 파일의 ARM 업로더는 32비트 실행 환경을 요구해, 이번에는 x86-64 제어 PC에서 업로드했다.

### 그리퍼 보정과 명명 자세

그리퍼 모터 각도의 물리 범위는 −51.0°~233.8°로 잡았다. 열기 목표인 90.9°를 ROS 관절 좌표의 0 m로 두고, 닫기 목표인 233.8°를 약 −37.4 mm로 환산했다. 드라이버의 읽기·쓰기, URDF와 ros2_control의 위치 제한, MoveIt의 열기·닫기 목표를 맞췄다. 이 값은 ROS의 핑거 관절 좌표다. 핑거 사이 간격은 별도 실측이 필요하다.

현재 자세에서 팔과 그리퍼를 각각 MoveIt의 `nominal` 자세로 저장했다. 팔의 기존 좌표계와 위치 제한은 유지했다. 제어 PC에서 한 축씩 약 5° 이동하는 시험에서는 `joint1`과 `joint2`의 이동 및 복귀를 확인했다. `joint3`는 제한 시간 내 목표에 도달하지 못했고 복귀 명령 뒤에도 시작 위치와 차이가 남았다. `joint4`는 이번에 시험하지 않았다.

파이에서 Cartographer를 제외한 7개 패키지를 먼저 빌드했다. 이후 보정 변경이 있는 description, hardware, MoveIt config 패키지 3개를 다시 빌드했다. 설치된 SRDF의 `nominal` 정의와 Xacro로 생성한 URDF의 그리퍼 제한까지 확인했다.

### 파이에 다시 연결한 뒤 확인한 항목

| 항목 | 결과 |
| --- | --- |
| OpenCR | USB 시리얼 포트 재인식. OpenCR 모델 20480 응답 |
| 팔 4축과 그리퍼 | 모터 명령 없이 위치를 세 번 읽었다. 세 번 모두 같은 위치였고, 배포된 위치 제한 안에 있었다 |
| LDS-03 LiDAR | 드라이버를 단독 실행해 `/scan` 메시지의 `base_scan` 프레임을 확인 |
| D435 | 앞선 단독 시험에서 USB 3.2 연결과 ROS 2 컬러 영상 메시지 수신 확인 |

Linux에서 시리얼 경로를 확인하려면 `ls -l /dev/serial/by-id/`를 실행한다. ROS 환경에서 LiDAR가 발행 중이라면 아래 명령으로 메시지 한 건을 확인할 수 있다.

```bash
ros2 topic echo /scan sensor_msgs/msg/LaserScan --field header.frame_id --once --qos-reliability best_effort
```

파이에서의 전체 실물 기동과 동작은 아직 확인하지 않았다. `joint3` 응답과 이전에 약 180~197 ms까지 늘어난 제어 주기를 확인한 뒤 통합 시험을 진행한다. 지도 작성과 Nav2 주행도 별도 검증이 남아 있다.
