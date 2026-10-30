# Compact climate row — 냉난방

[UI에서 구성하기](visual-editor.md) · 아래 YAML 예제도 동일하게 사용할 수 있습니다.

![냉난방 카드 대표 화면](../images/compact-climate-row.jpg)

운전 모드와 설정 온도를 바로 조작하는 냉난방 카드입니다. 이름 아래에 현재 상태와 현재 온도를 표시하고, 지원 모드만 버튼으로 제공합니다. 이미지는 모의 상태를 사용하는 로컬 미리보기입니다. 기기의 지원 모드·속성과 카드 너비에 따라 실제 화면은 달라집니다.

## 시작하기

먼저 [설치 가이드](../README.ko.md#hacs-설치)에 따라 `compact-cards.js` 리소스를 등록하세요. 대시보드의 수동 카드 또는 YAML 편집기에 다음 구성을 추가하고 엔티티 ID를 실제 기기로 변경합니다.

```yaml
type: custom:compact-climate-row
entity: climate.living_room
name: 거실 냉난방
```

카드 추가 화면에서는 **Compact climate row**를 선택할 수 있습니다. 시각적 설정 편집기와 YAML 편집기를 모두 사용할 수 있습니다.

## 설정 옵션

| 옵션 | 필수 | 기본값 / 설명 |
| --- | --- | --- |
| `type` | 예 | `custom:compact-climate-row` |
| `entity` | 예 | 제어할 `climate.*` 엔티티 |
| `name` | 아니요 | 엔티티의 표시 이름. 이름이 없으면 엔티티 ID |
| `embedded` | 아니요 | 기본 `false`. 홈 패널 내부에서 테두리와 여백을 줄일 때 자동 적용되는 내부 배치 옵션. 독립 카드에서는 생략 권장 |

모드 목록, 온도 간격, 온도 범위는 YAML에서 복제하지 않고 엔티티 속성을 따릅니다. 색상은 Home Assistant 테마의 냉난방 상태 색상을 사용합니다.

## 조작 방법

| 조작 | 동작 |
| --- | --- |
| 이름·상태 영역 누르기 | Home Assistant 상세 정보 열기 |
| 모드 아이콘 누르기 | 해당 운전 모드 요청. 현재 모드는 배경색과 선택 상태로 구분 |
| `−` / `+` 누르기 | 설정 온도를 기기의 `target_temp_step`만큼 변경 |
| 키보드 Tab 후 Enter 또는 Space | 선택한 버튼 실행 |

모드 버튼은 아이콘 중심으로 유지하여 시각적 밀도를 줄입니다. 현재 모드는 이름 아래 상태 텍스트와 선택 강조로 확인하며, 각 버튼은 툴팁과 접근성 이름으로 의미를 제공합니다.

기기에서 간격을 제공하지 않으면 섭씨는 0.5도, 화씨는 1도씩 변경합니다. 최솟값·최댓값을 넘지 않으며, 해당 한계의 방향 버튼은 비활성화됩니다. 현재 온도는 기기가 `current_temperature`를 제공할 때만 표시합니다.

운전 모드는 `off`, `heat`, `cool`, `dry`, `fan_only`, `auto`, `heat_cool` 중 엔티티가 제공하는 항목을 표시합니다. 다른 모드 값은 일반 온도조절기 아이콘과 원래 모드 이름으로 표시합니다. 모든 모드가 모든 기기에 표시되는 것은 아닙니다.

단일 목표 온도 기능을 지원하고 숫자 `temperature`가 있을 때만 `−` / `+`를 사용할 수 있습니다. 상한·하한 온도 범위만 지원하는 기기에서는 온도 버튼이 비활성화됩니다. 팬 속도·스윙·프리셋·범위 온도 등은 이름을 눌러 상세 정보에서 조작하세요.

## 좁은 카드와 터치 환경

카드 너비가 380px 이하이면 모드 버튼을 이름·온도 아래로 옮깁니다. 모드가 네 개 이상인 기기는 540px 이하에서 아래로 옮기고, 터치 환경에서는 이 기준을 640px로 넓힙니다. 터치 환경에서는 일반적인 모드 수에서도 440px 이하에서 아래로 배치합니다. 모드가 많으면 추가로 감싸며 버튼을 작게 압축하지 않습니다.

터치 환경의 모드·온도 버튼은 44px 조작 영역을 사용합니다. 지원하는 기기에서는 실제 운전 동작에 따라 아이콘이 움직이고, 운영체제의 동작 줄이기 설정에서는 애니메이션을 중지합니다.

서비스 요청 중에는 모드·온도 제어를 비활성화하고 점선 표시로 처리 중임을 알립니다. 요청이 끝나면 다시 조작할 수 있습니다. 서비스 응답과 기기의 실제 상태 갱신 시점은 통합에 따라 다르며, 화면 상태는 Home Assistant가 보고한 값으로 표시합니다. 요청 실패 시 알림을 표시하고 버튼을 복구합니다.

## 홈 패널에 넣기

```yaml
type: custom:compact-home-panel
items:
  - type: heading
    name: 거실
  - type: climate
    entity: climate.living_room
    name: 냉난방
```

패널에서는 같은 냉난방 구현을 사용하며 외곽 테두리와 여백을 줄입니다. `embedded`를 직접 지정할 필요는 없습니다. 자세한 구성은 [홈 패널 가이드](compact-home-panel.md)를 참고하세요.

## 표시가 예상과 다를 때

- `확인 불가`: 엔티티가 없거나 `unknown` / `unavailable` 상태인지 확인합니다. 이 상태에서는 제어하지 않습니다.
- 온도에 `—`가 표시됨: 엔티티에 숫자 목표 온도가 있는지 확인합니다.
- 특정 모드가 없음: 기기가 제공하는 `hvac_modes`를 확인합니다. 카드가 지원하지 않는 기기 기능을 추가하지는 않습니다.
- 명령 실패: Home Assistant 개발자 도구에서 같은 기기의 냉난방 서비스를 실행할 수 있는지 확인합니다.

## English

Use `custom:compact-climate-row` with a required `climate.*` `entity` and optional `name`. Tap the name to open more-info; mode buttons request supported HVAC modes, and −/+ follows the device step and limits. A single target-temperature feature and a numeric temperature are required for temperature controls. Range-only thermostats need more-info for range adjustment.

Modes wrap below the name and temperature on narrow cards; coarse-pointer devices get 44px targets. Controls disable and show a busy outline during service requests, then recover after success or failure. Reported state comes from Home Assistant. Embed the same card using `type: climate` in a home panel. The representative image uses mocked local preview data.
