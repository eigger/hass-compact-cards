# 조작 피드백과 작은 움직임

별도 설정 없이 기존 7종 카드에 적용됩니다. 버튼은 누르는 동안 아주 작게 눌리고 놓으면 돌아옵니다. 키보드 포커스는 유지하며 버튼·슬라이더의 공간은 늘리지 않습니다.

서비스를 호출하는 카드는 상단의 얇은 표시선으로 요청 중(테마 기본색), 전달 성공(성공색), 실패(오류색)를 구분합니다. 스크린리더에도 요청 상태를 알립니다. 성공·실패 표시는 약 1.8초 후 사라집니다. 실패 시 기존 오류 알림도 유지됩니다. 성공은 서비스 요청이 반환되었다는 의미이며 실제 기기 상태를 미리 바꾸거나 기기 동작 완료로 표시하지 않습니다.

- 냉난방: 실제 `hvac_action: fan`으로 송풍 중일 때 선택된 송풍 아이콘이 천천히 회전합니다. 대기·꺼짐·연결 불가에서는 회전하지 않습니다. 기존 난방·냉방·제습 동작 표시는 유지합니다.
- 홈 패널: 토글·선택·실행 요청에 공통 피드백을 적용합니다. 삽입된 제어 행은 해당 행에서 피드백을 보여줍니다.
- 조명: 켜짐 색상과 눌림 상태는 실제 엔티티 상태를 따릅니다. 접근성 이름은 현재 가능한 켜기/끄기 동작을 설명합니다. 취소한 슬라이더 조작은 실제 표시값으로 복구합니다.
- 커튼: 실제 `opening` 또는 `closing`일 때 해당 방향 화살표만 3px 범위로 움직입니다. 단순 요청 중에는 기기가 움직인다고 가정하지 않습니다. 열기 요청 중에도 지원되는 정지 버튼을 사용할 수 있습니다.
- 장면: 성공한 항목에 잠깐 `요청 전달됨`을 표시합니다. 스크립트가 실제 실행 중이면 `실행 중`을 우선합니다. 스크립트 종료나 모든 장치 동작 완료를 의미하지 않습니다.
- 환경: 값·단위·임계값 중심의 표시를 유지하고 상세 정보 버튼에 눌림 피드백을 적용합니다.
- 미디어: 실제 `playing` 상태일 때 재생 버튼 아래 작은 점을 표시합니다. 연속 점멸이나 앨범 아트 없이 재생 상태를 보조합니다.

다른 항목으로 재설정하거나 카드가 화면에서 제거되면 피드백과 타이머를 정리합니다. 늦게 반환된 이전 요청이 새 설정에 성공 표시를 덮어쓰지 않습니다. `prefers-reduced-motion: reduce`에서는 눌림 확대·축소, 아이콘 반복 움직임과 전환을 줄입니다. 요청 상태 표시와 접근성 안내는 유지됩니다.

## English

All seven cards receive subtle press feedback without new configuration or added layout space. Service requests use a thin pending/success/error line and a polite live status; transient completion feedback clears after about 1.8 seconds. Success means the service request returned, not that a physical device completed its action. Reported device states remain authoritative.

Fan rotation and cover arrow movement follow actual active state only; cover Stop remains usable while an opening request is pending. Scene shortcuts briefly show request acceptance, and media playback uses a small static dot. Reconfiguration/disconnection clears feedback and prevents stale responses from labeling a different configuration. Reduced-motion preferences disable movement while retaining status feedback.

[전체 카드 대표 화면](../images/overview.jpg) · [카드별 상세 가이드](../README.ko.md#카드-미리보기와-상세-가이드)
