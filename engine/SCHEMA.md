# storyboard.json 스키마

화면별 폴더의 `storyboard.json` 한 파일이 **사람용 와이어프레임 + AI용 데이터 + 위키 마크다운**의 단일 원본입니다.
공용 엔진(`engine/engine.js`)이 이 파일을 읽어 자동 렌더합니다.

## 최상위 구조

```json
{
  "title": "스토리보드 제목",
  "purpose": "이 화면(흐름)의 목적 한두 문장",
  "updatedAt": "",                       // 배포 시 자동 기록
  "figmaUrl": "",                        // 디자이너 Figma 링크 (선택)
  "designSystemRef": "BERIZ Design System",
  "screens": [ Screen, ... ]             // 1개 이상. 여러 개면 가로 플로우로 렌더
}
```

## Screen

```json
{
  "name": "화면 이름",                    // 프레임 위 라벨
  "appbar": { "title": "상단 타이틀", "back": true },   // 선택
  "blocks": [ Block, ... ]
}
```

## Block 공통

- `type` (필수): 아래 타입 중 하나
- `pin` (선택): 이 블록에 **번호 주석핀**을 달고 오른쪽 설명 패널에 항목 생성. 값은 짧은 라벨(예: "공연정보")
- `desc` (선택): 핀에 연결되는 설명 텍스트. `pin`이 있을 때만 의미. **정책/요구사항 설명을 여기에.**

> 설명을 달고 싶은 블록에만 `pin`+`desc`를 넣으세요. 핀 번호는 화면 순서대로 자동 매겨집니다.

## Block 타입

| type | 주요 속성 | 용도 |
|------|-----------|------|
| `text` | `title`, `sub`(개행 `\n` 가능), `align:"center"` | 제목/설명 텍스트 |
| `image` | `label`, `h`(높이px, 기본120) | 이미지·포스터 자리 |
| `list` | `items:[{avatar:bool,title,sub,trailing}]` | 행 목록(아바타 원형 선택) |
| `card` | `title,sub,image:bool,imageLabel,avatar:bool,trailing` | 카드 |
| `fields` | `rows:[[키,값],...]`, `badge:bool`, `badgeRow:idx` | 키-값 정보(badgeRow는 값을 뱃지로) |
| `button` | `text`, `style:"primary"\|"ghost"\|"line"` | 버튼(알약형) |
| `search` | `placeholder` | 검색 입력칸 |
| `segmented` | `items:[..]`, `active:idx` | 세그먼트 탭 |
| `chips` | `items:[..]` | 칩/태그 |
| `qr` | `code`, `label` | QR 코드 자리(코드로 패턴 생성) |
| `status` | `text`, `state:"unused"\|"used"\|"info"` | 상태 배지 |
| `pager` | `total`, `active`, `label` | 페이지 인디케이터(여러 장) |
| `bottomnav` | `items:[라벨..]`, `active:idx` | 하단 탭바 |
| `note` | `text` | 와이어프레임 주석(점선 박스) |
| `divider` / `spacer` | `spacer.h` | 구분선 / 여백 |

## 예시 (한 화면)

```json
{
  "name": "펫시터 목록",
  "appbar": { "title": "Pet-sit", "back": true },
  "blocks": [
    { "type": "search", "placeholder": "지역을 입력하세요" },
    { "type": "segmented", "items": ["전체","평점순","거리순"], "active": 1 },
    { "type": "text", "title": "Top rated", "pin": "정렬/추천", "desc": "평점 상위 시터를 먼저 노출. 정렬 기준은 ..." },
    { "type": "list", "items": [
      { "avatar": true, "title": "Hubert", "sub": "1.5km · ★4.9", "trailing": "상세" },
      { "avatar": true, "title": "Neko", "sub": "2.1km · ★4.8", "trailing": "상세" }
    ], "pin": "시터 카드", "desc": "아바타·이름·거리·평점·상세 버튼으로 구성." },
    { "type": "bottomnav", "items": ["홈","펫","시터","설정"], "active": 2 }
  ]
}
```
