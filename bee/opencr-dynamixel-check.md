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
