# 안다미로 직원관리 V11

## 배포 순서
1. GitHub 저장소에 이 프로젝트 전체 업로드
2. Vercel Import 후 Deploy
3. Apps Script에 `apps-script-v11.gs` 전체 붙여넣기
4. 웹앱 새 버전 배포
5. Vercel Environment Variable 등록
   - `NEXT_PUBLIC_API_URL` = Apps Script `/exec` 주소
6. Vercel Redeploy

## V11 핵심
- 첫 화면은 dashboard API만 호출
- 탭별 데이터만 별도 호출
- 저장 후 해당 탭만 갱신
- 빠른실행 버튼 정상 작동
- 인센티브 수기조정 즉시 반영
