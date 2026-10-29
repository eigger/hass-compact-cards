# Compact environment panel · 환경 요약

![온도·습도·CO₂를 작은 셀로 표시하는 Compact environment panel](../images/compact-environment-panel.jpg)

온도·습도·CO₂ 등 숫자 센서를 작은 셀로 모아 표시합니다. 각 셀에서 이름·값·단위를 읽고, 누르면 해당 엔티티의 Home Assistant 상세 정보를 엽니다. 필요한 센서에만 임계값을 지정하여 색상과 `주의`·`위험` 문구를 함께 표시할 수 있습니다.

## 기본 설정

```yaml
type: custom:compact-environment-panel
items:
  - entity: sensor.living_room_temperature
    name: 온도
  - entity: sensor.living_room_humidity
    name: 습도
  - entity: sensor.living_room_co2
    name: CO₂
```

엔티티 ID를 실제 환경에 맞게 변경하세요. 기존 `compact-cards.js` 리소스에 포함되어 별도 파일 설치가 필요 없습니다. 이 카드는 독립 카드로 사용하며 설정은 YAML로 작성합니다.

## 옵션

| 옵션 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `type` | 예 | — | `custom:compact-environment-panel` |
| `name` | 아니요 | 없음 | 패널 제목. 생략하면 제목 공간을 사용하지 않음 |
| `columns` | 아니요 | `auto` | 자동 열 배치 또는 고정 열 수 `1`, `2`, `3`, `4` |
| `items` | 예 | — | 하나 이상의 숫자 센서 항목 |
| `items[].entity` | 예 | — | `sensor.*` 엔티티 |
| `items[].name` | 아니요 | 엔티티 이름 | 셀에 표시할 이름. 엔티티 이름도 없으면 ID 표시 |
| `items[].icon` | 아니요 | 엔티티 아이콘 또는 기기 유형별 아이콘 | `mdi:thermometer` 같은 아이콘 |
| `items[].thresholds` | 아니요 | 없음 | 해당 센서에 적용할 임계값 목록 |
| `thresholds[].value` | 예, 조건을 넣을 때 | — | 비교할 숫자. 문자열이 아닌 YAML 숫자로 작성 |
| `thresholds[].direction` | 예, 조건을 넣을 때 | — | `above`(이상, ≥) 또는 `below`(이하, ≤) |
| `thresholds[].level` | 예, 조건을 넣을 때 | — | `warning`(주의) 또는 `critical`(위험) |

`columns: auto`는 카드 너비에 맞춰 배치합니다. 자동 환경 셀은 작은 영역에 값을 표시하도록 구성되며, 360px 이하에서는 장식 아이콘을 숨겨 값의 공간을 확보합니다. 제목을 생략하면 추가 제목 행이 생기지 않습니다. 긴 이름은 말줄임하고 전체 이름과 값은 툴팁 및 접근성 이름으로 제공합니다. 긴 단위나 큰 글자를 사용한다면 고정 `columns: 1` 또는 `2`를 선택할 수 있습니다.

## 임계값 설정

다음 예시는 조건 작성 방법을 보여줍니다. 조건은 실제 센서 단위와 원하는 기준에 맞춰 직접 지정하세요.

```yaml
type: custom:compact-environment-panel
name: 거실 환경
columns: auto
items:
  - entity: sensor.living_room_temperature
    name: 온도
    thresholds:
      - value: 18
        direction: below
        level: warning
      - value: 28
        direction: above
        level: warning
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

위 숫자는 설정 예시이며 건강·안전 기준을 내장한 것이 아닙니다. 임계값을 생략하면 값만 표시하고 정상·위험 여부를 추정하지 않습니다. 단위를 변환하지 않으므로 화씨 센서에는 화씨 기준의 숫자를 지정해야 합니다.

여러 조건이 동시에 맞으면 `critical`이 `warning`보다 우선합니다. 예를 들어 위 CO₂ 값이 `1500`이면 두 조건에 모두 해당하므로 `위험`으로 표시합니다. 경계값을 포함하여 `1000`이면 `주의`, `999`이면 두 조건 모두 적용되지 않습니다. `above`와 `below` 조건을 함께 사용하여 상한과 하한을 지정할 수 있습니다.

## 값 표시와 조작

- Home Assistant가 제공하는 지역화된 값 표시를 우선 사용하며 단위를 중복해서 붙이지 않습니다.
- 없는 엔티티, `unknown`, `unavailable`, 빈 값, 숫자가 아닌 값은 `—`와 `확인 불가`로 표시합니다. 이전 임계값 색상도 해제합니다.
- 엔티티가 존재하면 연결 불가 상태에서도 상세 정보를 열 수 있습니다. 엔티티가 없으면 해당 셀은 비활성화됩니다.
- 임계값은 표시 상태에만 사용됩니다. 자동화·알림 전송·기기 제어를 실행하거나 과거 데이터를 조회하지 않습니다.
- 버튼 높이는 최소 44px이며 키보드 포커스와 동작 줄이기 설정을 지원합니다.

## English

Use `custom:compact-environment-panel` with a nonempty `items` list of numeric `sensor.*` entities. Items accept optional `name`, `icon`, and `thresholds`. The panel accepts optional title `name` and `columns: auto` (default) or 1–4. Automatic cells favor compact readings and hide decorative icons at widths of 360px or less.

Each threshold requires numeric `value`, `direction: above/below` (inclusive ≥/≤), and `level: warning/critical`. Critical takes precedence when several conditions match. Thresholds compare the raw numeric state in the sensor's own units; there is no unit conversion or built-in health standard. Examples are configuration examples, not universal limits.

Press a reading for more-info. Missing, unknown, unavailable, empty, and nonnumeric values show a fallback and clear threshold styling. Existing unavailable entities can still open more-info. Thresholds only affect presentation; they do not send alerts, run automations, or retrieve historical data. Configuration uses YAML.
