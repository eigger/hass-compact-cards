# Compact camera card / 카메라 카드

**작은 실제 장면 썸네일과 이름**을 한 줄에 표시합니다. 썸네일이나 이름을 누르면 **Home Assistant 기본 상세 화면**에서 크게 확인합니다. 컴팩트 카드 안에서는 실시간 영상을 재생하지 않습니다.

A small camera thumbnail and title in one compact row. Tap the thumbnail or title to open HA's native entity details. The compact card never requests inline live playback. Native HA `picture-entity` preview handles authentication, thumbnail refresh, visibility and preview load errors.

```yaml
type: custom:compact-camera-card
entity: camera.front_door
name: 현관
```

| Option | Default | Description / 설명 |
| --- | --- | --- |
| `entity` | Required | `camera.*` entity / 카메라 엔티티 |
| `name` | Entity name or 카메라 | Title / 표시 이름 |
| `fit_mode` | `cover` | `cover` fills the thumbnail; `contain` keeps the whole view / 영역 채우기 또는 전체 보기 |

썸네일은 기본 폭 96px(좁은 카드에서는 72px), 16:9 고정입니다. 기본 채우기로 작은 영역에서도 카메라 장면을 식별하기 쉽게 합니다. 표시된 썸네일은 미리보기이며 항상 최신 프레임임을 뜻하지 않습니다. 기본 상세 화면의 실제 영상 지원은 카메라와 HA 설정에 따릅니다.

The visual editor exposes entity, name and fit mode. Missing/unavailable/off entities clear the thumbnail and recover when available. Failure to load HA's native card helper shows **재시도**. Loading and image errors inside the native preview use HA's UI. Removing the compact card disconnects its native child; reconnecting creates a new child and ignores outdated asynchronous results.

`camera_view: live` is rejected. There is no inline stream option, direct camera URL, PTZ, recording, microphone or home-panel embedding. The native helper is required; the local preview deliberately shows missing-runtime and unavailable states, not simulated video success.

See [HA picture entity configuration](https://www.home-assistant.io/dashboards/picture-entity/) and [camera documentation](https://www.home-assistant.io/integrations/camera/).

Local tests verify native preview configuration, stable updates, unavailable/recovery, detach/reconnect, stale helper results, retry and editor fields. Actual camera playback is not tested. Before release, check authenticated preview refresh, native details on tap, navigation away/back, error recovery, and mobile light/dark layouts in real HA. Examples: `examples/picture-preview.html`, `examples/picture-cards.yaml`.

Sections defaults to full section width with a minimum of six columns. Narrow cards shrink the thumbnail and wrap the retry button below the title to keep the title readable. / Sections에서는 기본 전체 폭을 사용하며, 좁은 카드에서는 썸네일을 줄이고 재시도 버튼을 제목 아래로 배치합니다.
