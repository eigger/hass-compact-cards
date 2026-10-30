# 방별 쇼케이스와 대표 이미지

`examples/showcase.html`은 카드 목록을 단순 나열하는 테스트 화면 대신 거실·침실·집 전체의 실제 사용 맥락으로 구성한 모의 대시보드입니다. 일곱 카드 유형의 실제 `compact-cards.js` 구현을 그대로 생성하며, 카드 내부 모양을 HTML로 다시 그리거나 스크린샷용 스타일로 덮어쓰지 않습니다.

## 로컬 실행

저장소 루트를 정적 서버로 제공한 뒤 다음 경로를 엽니다.

- 밝은 테마: `/examples/showcase.html`
- 어두운 테마: `/examples/showcase.html?theme=dark`
- 밝은 테마 캡처: `/examples/showcase.html?capture=true`
- 어두운 테마 캡처: `/examples/showcase.html?theme=dark&capture=true`

예를 들어 저장소 루트에서 `python -m http.server 8129 --bind 127.0.0.1`로 실행했다면 브라우저의 `http://127.0.0.1:8129/examples/showcase.html`에서 확인할 수 있습니다. 이미 같은 포트를 사용하는 서버가 있다면 해당 서버를 사용하거나 다른 포트를 선택하세요.

1160px 전후의 브라우저에서는 방별 세 열, 중간 너비에서는 두 열, 640px 이하에서는 한 열로 배치합니다. 모바일에서는 대시보드 전체를 축소하지 않고 실제 카드 너비에 따라 재배치합니다. `capture=true`는 테마 전환 버튼만 숨기고 제목·짧은 설명과 모의 화면 고지는 유지합니다. 테마는 실제 테마 CSS 변수를 사용합니다.

## 구현과 모의 동작

- 냉난방·홈 패널·조명·커튼·장면·환경·미디어는 모두 실제 커스텀 엘리먼트입니다.
- 거실에는 온습도·CO₂, 냉난방, 색온도 조명과 스피커를 묶었습니다.
- 침실에는 온습도, 냉난방, 커튼과 밝기 조명을 묶었습니다.
- 집 전체에는 장면 바로가기, 다른 공간의 조명·전원, 전기 사용량 비교를 묶었습니다.
- 카드의 상태 표시, 아이콘 선택, 버튼 크기, 반응형 배치, 처리 중 피드백과 움직임은 실제 번들의 구현을 따릅니다.
- Home Assistant의 `ha-card`·`ha-icon`만 로컬 시각 프리미티브로 대신합니다. 아이콘은 기존 `preview-icons.js`의 로컬 MDI 경로를 재사용합니다. 외부 이미지·폰트·스크립트를 요청하지 않습니다.
- 서비스 호출은 약 350ms 후 메모리의 모의 상태만 변경합니다. 커튼 이동과 스크립트 실행 중 상태도 짧게 모사하며 실제 기기에는 연결하지 않습니다.
- 이름·값을 눌렀을 때 모의 상세 정보 토스트를 표시합니다. 이는 실제 HA 상세 정보 창을 재현한 것이 아닙니다.

이미지는 **생성형 이미지나 가상의 카드 목업이 아니라 이 페이지를 실제 브라우저에서 캡처한 결과**를 사용해야 합니다. README 대표 이미지를 바꿀 때에는 테마·브라우저 너비와 캡처 대상 커밋을 함께 기록하세요. 모의 상태 기반이므로 실제 HA 테마·버전·기기의 모든 동작을 검증한 화면은 아닙니다.

## Home Assistant에서 같은 구성 사용

`examples/showcase.yaml`은 HTML의 카드 설정과 동일한 엔티티·이름·옵션을 사용하는 대시보드 예제입니다. 기본 Sections 뷰의 방별 섹션 제목을 제외하면 HTML과 같은 커스텀 카드 설정을 사용합니다. 엔티티 ID를 실제 장치·센서·장면에 맞게 바꾸고 카드 리소스를 먼저 등록하세요. HTML의 모의 엔티티나 상태는 YAML만으로 생성되지 않습니다.

[Home Assistant 공식 Sections 문서](https://www.home-assistant.io/dashboards/sections/)의 대시보드 구조를 따릅니다.

쇼케이스의 카드 설정을 변경하면 YAML도 함께 변경하여 두 예제가 같은 구성을 유지하도록 하세요. 실제 HA의 Sections 배치는 HA 버전·대시보드 설정에 따라 HTML의 CSS 그리드와 차이가 있을 수 있습니다.

## English

The showcase renders the real seven custom-card elements in coherent living-room, bedroom, and whole-home groups. Only HA's visual primitives and entity/service context are mocked. All resources are local. Use `theme=dark` for dark mode and `capture=true` to hide the theme switch while retaining the title and mock-data disclosure. Desktop layouts use three columns; narrow viewports reflow instead of scaling cards down.

`examples/showcase.yaml` contains the same custom-card configurations for an HA Sections dashboard. Replace entity IDs with your own; it does not create mock entities. Representative images should be actual browser captures of this page, with capture context recorded. This is a demonstration, not live-device compatibility evidence.
