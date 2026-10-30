# Compact image card / 이미지 카드

작은 썸네일과 이름만 한 줄에 표시합니다. 썸네일 또는 이름을 누르면 `image.*` 엔티티는 **HA 기본 상세 화면**, 고정 이미지 URL은 **HA 기본 picture 카드를 담은 확대 대화상자**로 엽니다. 컴팩트 카드 안에서는 큰 이미지나 영상을 재생하지 않습니다.

A small 96px-wide (72px in narrow cards) thumbnail and title in one compact row. Tap the thumbnail or title for native HA entity details, or a native `picture` card in a closable dialog for a static URL. Image entities and URLs are mutually exclusive.

```yaml
type: custom:compact-image-card
image: /local/floor-plan.png
name: 우리 집
alt_text: 방과 출입구 위치를 보여주는 집 평면도
fit_mode: contain
```

```yaml
type: custom:compact-image-card
entity: image.front_door_event
name: 최근 현관 이미지
alt_text: 현관 카메라의 최근 감지 이미지
```

| Option | Default | Description / 설명 |
| --- | --- | --- |
| `image` | — | Root-relative path such as `/local/photo.jpg`, or HTTP(S) URL. Choose this or `entity`. / 이미지 경로 또는 URL |
| `entity` | — | `image.*` entity. Choose this or `image`. / 이미지 엔티티 |
| `name` | Entity name or 이미지 | Title / 표시 이름 |
| `alt_text` | Display name | Image alternative text / 대체 텍스트 |
| `fit_mode` | `cover` | `cover` crops to fill; `contain` keeps the whole image / 영역 채우기 또는 전체 보기 |

썸네일은 16:9 고정이며 기본 영역 채우기로 외곽 틀까지 빈틈없이 표시합니다. 평면도처럼 전체 이미지가 필요하면 `fit_mode: contain`을 사용하세요. 이때 남는 여백은 검정으로 표시합니다. 로딩 실패 시 **재시도**를 표시하고, 엔티티 사용 불가 또는 이미지 주소 유실 시 이전 썸네일을 제거합니다. 엔티티의 토큰·상태 변경을 이미지 요청에 반영하며 고정 URL 이미지는 주기적 자동 새로고침을 하지 않습니다.

Thumbnails fill their 16:9 frame by default. Use `fit_mode: contain` for uncropped floor plans or photos; any remaining space is black.

Use the visual editor or YAML. Store local files under `/config/www/` and refer to them as `/local/…`. Remote images must be browser-reachable; HTTPS dashboards should use HTTPS URLs. Full-size display requires the HA runtime. No upload, `media-source://`, navigation actions or home-panel embedding is implemented.

Image-entity proxy behavior follows [HA frontend](https://github.com/home-assistant/frontend/blob/dev/src/data/image.ts); hosting follows the [official picture card guide](https://www.home-assistant.io/dashboards/picture/). Local tests cover load/error/retry, entity refresh/recovery, keyboard activation, native dialog configuration and editor round trips. Live HA authentication and dialog rendering still need verification. See `examples/picture-preview.html` and `examples/picture-cards.yaml`.

Sections defaults to six of twelve columns so two cards can sit side by side at the existing compact height. Existing dashboard width overrides remain in effect; set the layout width to six columns to pair previously saved full-width cards. In other dashboard layouts, use a two-column grid (`examples/picture-cards.yaml`). Narrow cards shrink the thumbnail and wrap the retry button below the title. / Sections에서는 기본 반폭(6열)으로 두 카드를 가로 배치합니다. 기존에 전체 폭으로 저장한 카드는 레이아웃 너비를 6열로 변경하세요. 다른 대시보드 배치에서는 2열 grid를 사용하세요. 좁은 카드에서는 썸네일을 줄이고 재시도 버튼을 제목 아래로 배치합니다.
