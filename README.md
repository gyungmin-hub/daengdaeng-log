# 🐾 댕댕로그 — 반려견 산책 기록 앱

> v1.0 · React Native (Expo) · 사이드 프로젝트

---

## 📁 프로젝트 구조

```
댕댕로그/
├── App.js                          # 루트 + 네비게이션
├── app.json                        # Expo 앱 설정
├── package.json
├── babel.config.js
├── assets/
│   └── bichon_sprite.jpg           # 상태별 비숑 스프라이트 (576×1024)
└── src/
    ├── components/
    │   └── BichonSprite.js         # 스프라이트 시트 컴포넌트
    ├── screens/
    │   ├── HomeScreen.js           # 메인 (idle / walking / finished)
    │   └── HistoryScreen.js        # 전체 기록
    └── utils/
        └── storage.js              # AsyncStorage 저장/불러오기
```

---

## 🚀 실행 방법

```bash
npm install
npx expo start
```

핸드폰에 **Expo Go** 앱 설치 후 QR 코드 스캔

---

## 📊 스프라이트 구조

`assets/bichon_sprite.jpg` (576×1024px, 세로 3등분)

| 섹션 | 상태 | 설명 |
|------|------|------|
| 상단 (0~341px) | walking | 달리는 비숑 |
| 중단 (341~682px) | idle | 앉은 비숑 |
| 하단 (682~1024px) | finished | 누운 비숑 |

---

## 💾 데이터 구조

AsyncStorage 키: `dogwalk_records`

```json
[{ "id": "1719820800000", "date": "2025-07-01T10:00:00.000Z", "duration": 1320 }]
```

---

## ☁️ 배포 (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```

빌드 완료 후 APK 다운로드 링크 생성 → 카카오톡으로 공유 가능
