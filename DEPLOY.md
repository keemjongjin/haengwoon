# 🚀 배포 가이드 (Epic 6)

현재 상태: **Epic 1~5 구현 완료.** 단, 데이터 계층은 **개발용 인메모리 repo**(`lib/db/repo.ts`)로 동작 중입니다.
Vercel 서버리스는 요청마다 프로세스가 분리/초기화되므로, **실제 배포 전에 DB 연결이 필수**입니다.

---

## ✅ 사전 준비물 (사장님이 발급)
| 항목 | 용도 | 없으면 |
|---|---|---|
| **Neon `DATABASE_URL`** | 데이터 영속화 | **필수** (없으면 배포 시 데이터 유지 안 됨) |
| **Vercel 계정** | 호스팅 | 필수 |
| `ADMIN_KEY` / `JWT_SECRET` | 관리자 인증 | 필수 (임의 강한 값) |
| Spotify `CLIENT_ID/SECRET/REFRESH_TOKEN` | 앨범 메타·재생 | 선택 (없으면 mock) |
| Giscus `REPO/REPO_ID/CATEGORY/CATEGORY_ID` | Tech 댓글 | 선택 (없으면 안내 표시) |
| `NEXT_PUBLIC_SITE_URL` | RSS 절대경로 | 권장 |

---

## 📋 배포 순서

### 1. Neon DB 생성
- Vercel 마켓플레이스 또는 neon.tech 에서 Postgres 생성 → `DATABASE_URL` 확보.

### 2. 스키마 반영
```bash
# .env.local 에 DATABASE_URL 채운 뒤
npm run db:push        # drizzle 스키마 → Neon 테이블 생성
```

### 3. ⚠️ 데이터 계층 전환 (코드 작업 — 남은 유일한 개발 과제)
`lib/db/repo.ts`(인메모리)를 **Drizzle 구현으로 교체**해야 합니다.
- 스키마는 이미 `lib/db/schema.ts`, 클라이언트는 `lib/db/index.ts`에 준비됨.
- repo의 메서드(`listAlbums`, `vote`, `addComment` 등)를 Drizzle 쿼리로 1:1 대응.
- 인메모리는 동기, Drizzle는 비동기 → repo를 async로 바꾸고 호출부(페이지·API)에 `await` 추가.
- Elo 계산(`lib/elo.ts`)·스팸(`lib/spam.ts`)·해시(`lib/hash.ts`)는 그대로 재사용.
> 이 전환 후에는 인메모리 시드가 사라지므로, `/music/admin`에서 앨범을 등록해 데이터를 채웁니다.

### 4. Vercel 배포
- GitHub 저장소를 Vercel에 import.
- 환경변수 등록(위 표) → Deploy.
- Next.js 자동 감지, 빌드/배포됨.

### 5. 배포 후
- `/music/admin` 로그인(`ADMIN_KEY`) → 앨범 등록 → 평점/월드컵 시작.
- Spotify 키를 넣으면 mock 재생이 실제 재생으로 바뀜(Epic 4 후반 SDK 연동 필요).
- Giscus 값을 넣으면 Tech 댓글 활성화.

---

## 🧪 로컬 검증 명령
```bash
npm run test     # Elo 엔진 유닛 테스트 (vitest)
npm run build    # 프로덕션 빌드 (타입·SSG 검증)
npm run dev      # 개발 서버 (인메모리 데이터로 전체 흐름 체험)
```

## 📌 남은 작업 요약
- [ ] `repo → Drizzle` 전환 (3번) — DB 연결 후 진행·검증
- [ ] Spotify 실 연동 (client credentials + Web Playback SDK)
- [ ] Giscus 실제 값 연결
- [ ] Vercel 실제 배포
