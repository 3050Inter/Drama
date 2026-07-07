# 🎬 드라마 LIVE V6.6

UI 리뉴얼 + 미수금 관리 포함 전체 프로젝트입니다.

## 포함 기능
- 설정 버튼 우측 상단 이동
- 하단 네비게이션 5개 재배치
- 홈 / 월별 / 인건비 / 미수금 / 설정
- 거래 입력/수정/삭제
- 지출항목 드롭다운
- 인건비(TC) 관리
- 직원 추가/비활성화
- 인건비 저장 시 거래내역 지출 자동 생성
- 월별 요약
- 미수금 등록/입금/완납/삭제
- 홈에 현재 미수금 표시

## 적용 순서
1. GitHub에 전체 덮어쓰기
2. Apps Script에 `apps-script/Code.gs` 전체 교체
3. 새 배포 후 `/exec` URL 발급
4. `lib/api.ts`의 `API_URL`에 URL 입력
5. Vercel 배포 확인


## V6.7 속도 최적화
- 홈 화면 API를 `dashboard + transactions` 2회 호출에서 `home` 1회 호출로 변경
- Apps Script에서 홈 데이터 조회 시 거래내역 시트를 한 번만 읽도록 개선
- 월별 API에서 불필요한 미수금 전체 조회 제거
- 전체 페이지 새로고침 없이 저장/수정/삭제 후 필요한 데이터만 갱신


## V6.8 추가 속도 최적화
- Apps Script CacheService 적용
- 홈/대시보드/거래내역 8초 캐시
- 월별 25초 캐시
- 직원/지출항목 60초 캐시
- 미수금 10초 캐시
- 저장/수정/삭제 시 관련 캐시 자동 삭제


## V6.8.1 미수금 수정 오류 Fix
- `updateReceivable` API export 추가
- `components/ReceivablePage.tsx` import 오류 수정
- Apps Script `updateReceivable_` 추가
- 미수금 summary 필드명 호환 처리


## V3.5.0-BACKEND-SPEED
- Apps Script init 통합 호출 추가
- 인건비/개인지출/미수금 백엔드 캐시 강화
- 탭 프리로드 API 호출 수 감소
