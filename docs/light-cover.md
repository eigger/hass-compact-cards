# 조명·커튼 직접 제어

별도 팝업을 열지 않고 자주 쓰는 기능을 조작하는 컴팩트 행입니다. 이름은 상세 정보를 열고, 오른쪽 버튼과 슬라이더는 기기를 바로 제어합니다.

```yaml
type: custom:compact-light-row
entity: light.living_room
name: 거실 조명
```

- 전원은 한 번에 켜기/끄기. 밝기와 색온도는 기기가 지원할 때만 표시합니다.
- 밝기는 0–100%, 0은 끄기입니다. 색온도는 기기의 Kelvin 범위를 사용합니다.
- 슬라이더는 이동 중 값을 표시하고 놓을 때 명령을 한 번 보냅니다. 키보드 방향키도 사용할 수 있습니다.
- 색상 선택은 이름을 눌러 Home Assistant 상세 정보에서 이용합니다.

```yaml
type: custom:compact-cover-row
entity: cover.living_room
name: 거실 커튼
```

- 열기·정지·닫기와 열림 위치(0%=닫힘, 100%=열림)를 지원 기능에 맞춰 표시합니다.
- 이동 명령을 전송 중이어도 정지는 사용할 수 있습니다.
- 위치를 보고하지 않는 기기는 위치 대신 `—`가 표시됩니다.

두 카드 모두 `entity`가 필수이며 `name`은 선택입니다. 좁은 화면에서는 슬라이더가 다음 줄로 이동하고 터치 환경에서는 버튼 조작 영역을 넓힙니다. 연결 불가 시 조작이 비활성화되며 실패 시 알림을 표시합니다. 실제 동작은 Home Assistant의 기기 지원 범위에 따라 달라집니다.

## English

Use `custom:compact-light-row` with a `light.*` entity, or `custom:compact-cover-row` with a `cover.*` entity. Optional `name` overrides the entity name. Controls appear only when supported. Light rows offer power, brightness (0 turns off), and device-bounded Kelvin temperature. Cover rows offer open, stop, close, and position (0 closed, 100 open). Sliders commit on release, preserve edits during state updates, and support the keyboard. Stop remains available during a pending motion request. Names open more-info. Narrow rows wrap sliders; touch devices get larger targets. Unavailable controls are disabled and service errors produce notifications.
