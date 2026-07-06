# 🎬 드라마 LIVE V5.1

드라마 LIVE 가계부 복구 + Google Sheets 연결 준비 버전입니다.

## 포함
- Next.js 14.2.5
- Tailwind
- 홈 / 날짜 이동 / 하단 네비
- 거래내역 카드
- + 입력창
- Google Apps Script `Code.gs`
- `lib/api.ts` API 연결부

## 사용 순서
1. GitHub 저장소를 비운 뒤 이 ZIP 안의 파일을 전체 업로드
2. Vercel 배포 확인
3. Google Apps Script에 `apps-script/Code.gs` 전체 붙여넣기
4. 웹앱으로 배포
5. 발급된 `/exec` URL을 `lib/api.ts`의 `API_URL`에 붙여넣기
6. 다시 GitHub 커밋 → Vercel 자동 배포
