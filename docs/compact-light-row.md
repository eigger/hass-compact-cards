# Compact light row · 조명

[UI에서 구성하기](visual-editor.md) · 아래 YAML 예제도 동일하게 사용할 수 있습니다.

![조명 대표 화면](../images/compact-light-row.jpg)

모의 상태로 렌더링한 대표 이미지입니다. 조명 전원과 밝기를 같은 행에서 직접 제어하고, 지원 기기의 색온도를 바로 조절합니다. 긴 이름과 좁은 화면에서는 내용에 맞춰 줄을 나눕니다.

## 기본 예제

```yaml
type: custom:compact-light-row
entity: light.living_room
name: 거실 조명
```

| 옵션 | 필수 | 설명 |
| --- | --- | --- |
| `entity` | 예 | `light.*` 엔티티 |
| `name` | 아니요 | 생략하면 엔티티 표시 이름 |

## 조작

- 이름: Home Assistant 상세 정보. 색상 선택 등 추가 기능은 여기서 조작합니다.
- 전원: 한 번에 켜기/끄기. 켜진 상태는 버튼 배경과 눌림 상태로 구분합니다.
- 밝기: 기기가 지원할 때 0–100% 슬라이더를 표시합니다. 0은 끄기입니다.
- 색온도: `color_temp` 지원과 유효한 기기 최솟값·최댓값이 있을 때 Kelvin 슬라이더를 표시합니다.

슬라이더는 이동 중 숫자를 즉시 표시하고 변경을 확정할 때 한 번 전송합니다. 상태 갱신이 편집 중 값을 덮어쓰지 않으며, 요청이 끝난 뒤 최대 3초 동안 요청 값을 유지해 기기의 갱신 지연을 완화합니다. 실제 보고 값이 일치하면 유지 상태를 해제합니다. 실패 시 실제 값과 알림으로 복구합니다. 키보드 방향키로도 조절할 수 있습니다.

켜기/끄기 전용 조명에는 슬라이더를 표시하지 않습니다. 연결할 수 없거나 상태를 알 수 없는 기기는 조작을 비활성화합니다. 터치 환경은 44px 조작 영역을 사용합니다.

## 홈 패널 안에 넣기

```yaml
type: custom:compact-home-panel
items:
  - type: heading
    name: 거실
  - type: light
    entity: light.living_room
    name: 메인 조명
  - entity: light.accent
    name: 간접 조명
```

`type: light`는 밝기·색온도를 포함하는 전체 너비 행이고, `entity`만 지정한 일반 조명 항목은 작은 토글입니다. 용도에 맞게 조합하면 공간을 줄일 수 있습니다.

## English

Use `custom:compact-light-row` with required `light.*` entity and optional name. Power, brightness, and device-bounded Kelvin controls appear according to supported color modes. Sliders commit on release, preserve drafts during HA updates, and retain requested values briefly while awaiting acknowledgment. Zero brightness turns off. Embed with `type: light` in a home panel; a plain light item remains a small toggle. Screenshot uses mocked data, with local HA primitives and upstream MDI icons.
