# kuromoji.js 설치 가이드 (개발자용)

**이 가이드는 개발자가 Chrome Extension을 빌드하기 전에 kuromoji.js 파일을 포함시키기 위한 것입니다.**

사용자는 별도로 다운로드할 필요가 없습니다. Extension에 포함되어 자동으로 설치됩니다.

## 1. kuromoji.js 다운로드

### 방법 A: npm 사용 (권장)

```bash
# 프로젝트 루트에서 실행
npm install kuromoji

# 또는 yarn 사용
yarn add kuromoji
```

설치 후 다음 파일들을 복사:

- `node_modules/kuromoji/build/kuromoji.js` → `lib/kuromoji.js`
- `node_modules/kuromoji/dict/` → `dict/` (전체 폴더 복사)

### 방법 B: GitHub에서 직접 다운로드

1. https://github.com/takuyaa/kuromoji.js 에서 저장소 클론 또는 ZIP 다운로드
2. 다음 파일들을 프로젝트에 복사:
   - `build/kuromoji.js` → `lib/kuromoji.js`
   - `dict/` 폴더 전체 → `dict/`

### 방법 C: CDN에서 다운로드 (개발용)

```bash
# kuromoji.js 파일 다운로드
curl -o lib/kuromoji.js https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js

# 사전 파일은 npm이나 GitHub에서 다운로드 필요
```

## 2. 디렉토리 구조

설치 후 다음과 같은 구조가 되어야 합니다:

```
VoPet_Chrome_Extension/
├── lib/
│   └── kuromoji.js          # kuromoji.js 라이브러리
├── dict/                     # 사전 파일들
│   ├── charDefinition.js
│   ├── unknown.json
│   ├── CC-CEDICT.json
│   └── ... (기타 사전 파일들)
├── japaneseMorphology.js    # 형태소 분석 모듈
└── ...
```

## 3. 사전 파일 크기

- 전체 사전 파일 크기: 약 2-3MB
- 주요 파일:
  - `charDefinition.js`: 문자 정의
  - `*.json`: 단어 사전 파일들

## 4. 확인 방법

1. Chrome Extension을 로드
2. 개발자 도구 콘솔에서 확인:
   ```javascript
   // 일본어 텍스트 선택 시 자동으로 kuromoji.js가 로드됨
   // 콘솔에 "kuromoji.js 로드 완료" 메시지가 표시되면 성공
   ```

## 5. 문제 해결

### kuromoji.js를 찾을 수 없음

- `lib/kuromoji.js` 파일이 존재하는지 확인
- `manifest.json`의 `web_accessible_resources`에 `lib/*.js`가 포함되어 있는지 확인

### 사전 파일을 찾을 수 없음

- `dict/` 폴더가 존재하는지 확인
- `dict/` 폴더 내에 사전 파일들이 있는지 확인
- `manifest.json`의 `web_accessible_resources`에 `dict/*`가 포함되어 있는지 확인

### 로드 시간이 오래 걸림

- 정상입니다. 사전 파일이 크기 때문에 첫 로드 시 1-2초 소요될 수 있습니다.
- Lazy loading으로 일본어 텍스트 감지 시에만 로드되므로 초기 로딩에는 영향 없습니다.

## 참고

- kuromoji.js GitHub: https://github.com/takuyaa/kuromoji.js
- npm 패키지: https://www.npmjs.com/package/kuromoji
