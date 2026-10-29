# Compact media row

곡 정보, 재생/일시정지, 다음 곡과 음량을 작은 카드에서 직접 조작합니다. 앨범 아트로 공간을 차지하지 않으며 이름을 누르면 상세 정보를 엽니다.

```yaml
type: custom:compact-media-row
entity: media_player.living_room
name: 거실 스피커
show_volume: true
show_next: true
```

`entity`는 필수이며 `name`은 선택입니다. `show_volume`, `show_next`는 기본 `true`입니다. 기기가 지원하지 않는 기능은 숨기며 연결이 끊기면 조작을 비활성화합니다. 꺼진 기기가 전원 켜기를 지원하면 재생 버튼 위치에 전원 버튼을 표시합니다.

음량은 드래그하는 동안 값만 미리 표시하고 손을 놓아 변경을 확정할 때 한 번 전송합니다. 상태 갱신이 드래그 위치를 덮어쓰지 않습니다. 전송 후 최대 3초 동안 요청 값을 유지하여 갱신 지연에 따른 튀는 현상을 줄이고, 실패하면 알림과 실제 상태로 돌아옵니다. 음량 설정 기능만 있고 현재 음량을 제공하지 않는 기기는 슬라이더를 비활성화합니다.

처리 중에는 중복 명령을 막고 `처리 중…`을 표시합니다. 좁은 화면에서도 정보는 말줄임하고 조작 버튼 크기는 유지합니다. 키보드 조작과 동작 줄이기 설정을 지원합니다.

기능 비트와 서비스는 [HA media player 상수](https://github.com/home-assistant/core/blob/dev/homeassistant/components/media_player/const.py), [공식 미디어 문서](https://www.home-assistant.io/integrations/media_player/)를 참고했습니다. DOM 테스트는 실제 기기 동작이나 브라우저 레이아웃 검증을 대신하지 않습니다.
