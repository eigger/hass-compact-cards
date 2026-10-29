# 장면·환경 패널

두 카드는 기존 `compact-cards.js` 번들에 포함되며 별도 리소스 등록이 필요 없습니다. 엔티티 ID는 실제 환경에 맞게 변경하세요.

## 장면 빠른 실행

`custom:compact-scene-panel`은 장면·스크립트를 한 번의 터치로 실행합니다. 항목별 `confirmation` 문자열을 지정하면 확인 후 실행합니다. 실행 요청 중에는 중복 실행을 막고 상태를 표시합니다. 실행 중인 스크립트는 다시 실행할 수 없습니다. 아직 실행한 적 없는 장면의 `unknown` 상태는 실행할 수 있지만, 없는 엔티티와 `unavailable`은 사용할 수 없습니다.

```yaml
type: custom:compact-scene-panel
name: 빠른 실행
columns: auto
items:
  - entity: scene.relax
    name: 휴식
    icon: mdi:sofa-outline
  - entity: script.good_night
    name: 취침
    icon: mdi:weather-night
    confirmation: 취침 모드를 실행할까요?
```

## 환경 요약

`custom:compact-environment-panel`은 숫자 센서의 값·단위·이름을 함께 표시합니다. 누르면 해당 센서의 Home Assistant 상세 정보가 열립니다. 센서 값이 없거나 숫자가 아니면 `확인 불가`로 표시합니다. 임계값을 지정하지 않으면 값만 표시하며 정상·위험 여부를 추정하지 않습니다.

```yaml
type: custom:compact-environment-panel
name: 거실 환경
items:
  - entity: sensor.living_room_temperature
    name: 온도
  - entity: sensor.living_room_humidity
    name: 습도
  - entity: sensor.living_room_co2
    name: CO₂
    thresholds:
      - value: 1000
        direction: above
        level: warning
      - value: 1500
        direction: above
        level: critical
```

위 숫자는 설정 예시이며 건강·안전 기준이 아닙니다. 실제 센서 단위와 원하는 알림 조건에 맞춰 직접 지정하세요. `above`는 이상(≥), `below`는 이하(≤)이며 여러 조건을 만족하면 `critical`(위험)이 `warning`(주의)보다 우선합니다. 색상과 상태 문구를 함께 표시합니다. 센서 단위를 변환하지 않습니다.

## 공통 옵션

| 옵션 | 설명 |
| --- | --- |
| `name` | 선택. 패널 제목. 생략하면 제목 공간도 생략 |
| `columns` | 기본 `auto`. 너비에 따라 배치. `1`~`4`로 고정 가능 |
| `items` | 필수. 하나 이상의 엔티티 항목 |
| `items[].name` | 표시 이름. 생략하면 엔티티 이름 |
| `items[].icon` | 선택. MDI 아이콘 |

자동 배치는 카드 자체 너비를 기준으로 구성되며, 버튼 높이는 최소 44px입니다. 긴 이름은 말줄임하고 전체 이름을 툴팁과 접근성 이름에 제공합니다. 큰 글자나 좁은 카드에서 고정 열 수가 읽기 어렵다면 `auto` 또는 `1`을 사용하세요. 두 카드 모두 YAML 설정을 사용합니다.

## English

`custom:compact-scene-panel` accepts nonempty `items` with `scene.*` or `script.*` entities and optional `name`, `icon`, and `confirmation` text. Press a shortcut to call its domain's `turn_on`. Pending requests and running scripts cannot be activated again; never-activated scenes remain usable.

`custom:compact-environment-panel` accepts `sensor.*` items with optional explicit `thresholds`: numeric `value`, `direction: above/below` (inclusive), and `level: warning/critical`. Critical takes precedence. No default health or safety thresholds are assumed and no units are converted. Press a reading to open more-info.

Both panels accept optional title `name` and `columns: auto` (default) or 1–4. Automatic environment cells prioritize compact values; decorative icons are hidden below 360px to fit three common metrics without a spare row. Unavailable/non-numeric readings show a fallback.
