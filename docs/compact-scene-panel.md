# Compact scene panel · 장면 빠른 실행

[UI에서 구성하기](visual-editor.md) · 아래 YAML 예제도 동일하게 사용할 수 있습니다.

![장면·스크립트를 작은 버튼으로 모은 Compact scene panel](../images/compact-scene-panel.jpg)

휴식·외출·취침처럼 자주 사용하는 장면과 스크립트를 작은 버튼으로 모읍니다. 버튼 한 번으로 실행하고, 확인이 필요한 항목만 확인 문구를 추가할 수 있습니다. 실행 요청 중에는 해당 엔티티의 버튼이 비활성화되어 중복 명령을 막습니다.

## 기본 설정

```yaml
type: custom:compact-scene-panel
items:
  - entity: scene.relax
    name: 휴식
    icon: mdi:sofa-outline
  - entity: script.good_night
    name: 취침
    icon: mdi:weather-night
```

엔티티 ID를 실제 환경에 맞게 변경하세요. 기존 `compact-cards.js` 리소스에 포함되어 별도 파일 설치가 필요 없습니다. 이 카드는 독립 카드로 사용하며 시각적 편집기 또는 YAML로 설정합니다.

## 옵션

| 옵션 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `type` | 예 | — | `custom:compact-scene-panel` |
| `name` | 아니요 | 없음 | 패널 제목. 생략하면 제목 공간을 사용하지 않음 |
| `columns` | 아니요 | `auto` | 자동 열 배치 또는 고정 열 수 `1`, `2`, `3`, `4` |
| `items` | 예 | — | 하나 이상의 장면·스크립트 항목 |
| `items[].entity` | 예 | — | `scene.*` 또는 `script.*` 엔티티 |
| `items[].name` | 아니요 | 엔티티 이름 | 버튼에 표시할 이름. 엔티티 이름도 없으면 ID 표시 |
| `items[].icon` | 아니요 | 엔티티 아이콘 또는 유형별 아이콘 | `mdi:sofa-outline` 같은 아이콘 |
| `items[].confirmation` | 아니요 | 없음 | 실행 전 확인할 문자열. 취소하면 명령을 보내지 않음 |

`columns: auto`는 카드 너비에 따라 열 수를 조정합니다. 긴 이름을 사용하는 경우 `columns: 1`이나 `2`로 넓게 표시할 수 있습니다. 버튼 높이는 최소 44px이며, 긴 이름은 말줄임합니다. 전체 이름과 실행 상태는 툴팁 및 접근성 이름으로도 제공합니다.

## 제목과 선택적 확인

```yaml
type: custom:compact-scene-panel
name: 빠른 실행
columns: auto
items:
  - entity: scene.relax
    name: 휴식
    icon: mdi:sofa-outline
  - entity: scene.movie
    name: 영화
    icon: mdi:movie-open-outline
  - entity: script.good_night
    name: 취침
    icon: mdi:weather-night
    confirmation: 취침 모드를 실행할까요?
```

## 조작과 상태

- 장면 버튼은 `scene.turn_on`, 스크립트 버튼은 `script.turn_on`을 호출하며 해당 `entity_id`를 전달합니다.
- 실행 요청 중에는 `실행 요청 중…`을 표시합니다. 같은 엔티티를 여러 버튼에 넣어도 요청 중에는 함께 비활성화됩니다.
- 스크립트 상태가 `on`이면 `실행 중`을 표시하고 재실행을 막습니다. 스크립트가 끝나 `off`로 갱신되면 다시 사용할 수 있습니다.
- 아직 실행하지 않은 장면의 `unknown`은 정상적인 초기 상태일 수 있으므로 실행을 허용합니다. 없는 엔티티, `unavailable`, `unknown`인 스크립트는 `확인 불가`로 표시하고 실행하지 않습니다.
- 항목별로 요청 성공 시 `요청 전달됨`, 실패 시 `요청 실패`를 약 1.8초 표시합니다. 서로 다른 장면을 연달아 실행해도 각 항목의 결과는 독립적으로 유지됩니다.
- 호출이 실패하면 알림을 표시하고 요청 중 상태를 해제합니다. 서비스 요청 완료는 장면의 모든 실제 기기 동작 완료를 뜻하지 않습니다.

이 카드는 장면·스크립트를 실행하는 바로가기입니다. 임의 서비스, 별도 `target` 또는 서비스 데이터를 구성하는 옵션은 제공하지 않습니다. 키보드 포커스와 동작 줄이기 설정을 지원합니다.

## English

Use `custom:compact-scene-panel` with a nonempty `items` list of `scene.*` or `script.*` entities. Each shortcut accepts optional `name`, `icon`, and a `confirmation` string. The panel accepts optional title `name` and `columns: auto` (default) or a fixed count from 1 to 4. Omit the title to save space.

A shortcut calls the entity domain's `turn_on` with its entity ID. Pending requests and running scripts disable the corresponding shortcuts. A never-activated scene with state `unknown` remains usable; missing/unavailable entities and unknown scripts cannot run. Failures produce a notification. Request completion does not guarantee that every physical device has finished changing. Each item briefly retains its own accepted/error feedback during concurrent requests. Use the visual editor or YAML; arbitrary service data and targets are not options.
