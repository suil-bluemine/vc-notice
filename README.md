# VC 출자사업 공고 모니터

국내 주요 출자기관의 VC/PE 출자사업 공고를 AI로 실시간 수집하는 웹 서비스입니다.

## 수집 소스

| 소스 | 기관 | 비고 |
|------|------|------|
| KVIC | 한국벤처투자 | 모태펀드, 지역혁신벤처펀드 등 |
| KVCA | 한국벤처캐피탈협회 | 공제회 포함 취합 공고 |
| KGF | 한국성장금융 | 정책 출자사업 |
| VCS | 벤처투자종합포털 | 지자체 벤처펀드 |
| KBIZ | 중소기업중앙회 | 노란우산 출자사업 |
| NEWS | IB 뉴스 감지 | 경찰·군인·교직원공제회 등 비정기 공고 |

## 로컬 개발

```bash
npm install
npm run dev
```

## GitHub Pages 배포

### 1. 저장소 생성
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/vc-notice.git
```

### 2. vite.config.js base 경로 수정
```js
base: '/vc-notice/',  // 저장소명과 일치하게
```

### 3. GitHub Pages 설정
- Settings → Pages → Source: **GitHub Actions** 선택

### 4. 배포
```bash
git add .
git commit -m "init"
git push -u origin main
```

→ 자동으로 GitHub Actions가 빌드·배포합니다  
→ `https://YOUR_USERNAME.github.io/vc-notice/` 로 접근 가능

### 자동 스케줄
- 매일 오전 08:00 KST 자동 빌드 (GitHub Actions cron)
- push 시 즉시 배포

## 사용 방법

1. 사이트 접속 후 우측 상단 **"API 키 설정"** 클릭
2. Anthropic API 키 입력 (`sk-ant-...`)
3. **"공고 수집"** 버튼 클릭
4. AI가 6개 소스에서 실시간 수집 → 결과 표시
5. 결과는 6시간 캐시 (재방문 시 빠르게 표시)

> API 키는 브라우저 localStorage에만 저장되며 외부 서버로 전송되지 않습니다.

## 기술 스택

- React 18 + Vite
- Anthropic Claude API (claude-sonnet-4) + Web Search tool
- GitHub Pages (무료 호스팅)
- 별도 백엔드 없음 (순수 프론트엔드)
