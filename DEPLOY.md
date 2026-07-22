# 🚀 배포 가이드 (Epic 6)

현재 상태: **Epic 1~5 구현 완료 + Neon DB 연결 완료.**
데이터 계층은 `lib/db/repo.ts` — Drizzle + Neon(PostgreSQL) 기반으로 동작하며, 서버 재시작·재배포에도 데이터가 유지됩니다(로컬에서 재시작 후 영속성 검증 완료).

---

## ✅ 사전 준비물 (사장님이 발급)
| 항목 | 용도 | 상태 |
|---|---|---|
| **Neon `DATABASE_URL`** | 데이터 영속화 | ✅ 완료 (`.env.local` 반영, 스키마 push 완료) |
| **Vercel 계정** | 호스팅 | 남음 |
| `ADMIN_KEY` / `JWT_SECRET` | 관리자 인증 | ✅ 개발값 있음, **배포 전 강한 값으로 교체 권장** |
| Spotify `CLIENT_ID/SECRET/REFRESH_TOKEN` | 앨범 메타·재생 | 선택 (없으면 mock) |
| Giscus `REPO/REPO_ID/CATEGORY/CATEGORY_ID` | Tech 댓글 | 선택 (없으면 안내 표시) |
| `NEXT_PUBLIC_SITE_URL` | RSS 절대경로 | 배포 후 실제 도메인으로 교체 |

---

## 📋 배포 순서

### 1. Neon DB ✅ 완료
- 프로젝트 `haengwoon` 생성, `DATABASE_URL` 확보·연결 완료.
- 스키마 반영 완료: `npm run db:push` (albums/tracks/comments/matches/likes 5개 테이블).
- **자동 데모 시드**: albums 테이블이 비어있으면 최초 접속 시 데모 앨범 4개를 1회 자동 삽입합니다
  (`lib/db/repo.ts`의 `ensureSeeded`). 실제 서비스 데이터로 채우려면 `/music/admin`에서 직접 등록하세요.

### 2. 데이터 계층 ✅ 완료
`lib/db/repo.ts`는 이제 **Drizzle + Neon 기반**(비동기)으로 동작합니다. 인메모리 목이 아닙니다.
- 서버 재시작·재배포에도 데이터가 유지됨(로컬에서 검증 완료: 투표 → 서버 재시작 → Elo 값 유지 확인).
- `/music`, `/music/leaderboard`, `/music/archive`, `/music/insights`는 `dynamic = "force-dynamic"`으로
  설정되어 있어 **매 요청마다 최신 DB 데이터**를 보여줍니다(빌드 시점에 박제되지 않음).

### 3. Vercel 배포
- GitHub 저장소를 Vercel에 import.
- 환경변수 등록(위 표 — `DATABASE_URL` 포함) → Deploy.
- Next.js 자동 감지, 빌드/배포됨.

### 4. 배포 후
- `/music/admin` 로그인(`ADMIN_KEY`) → 앨범 등록 → 평점/월드컵 시작.
- Spotify 키를 넣으면 mock 재생이 실제 재생으로 바뀜(Epic 4 후반 SDK 연동 필요).
- Giscus 값을 넣으면 Tech 댓글 활성화.

### 🔎 데이터 직접 보는 법
- **Neon 웹 콘솔**(neon.tech) — 테이블 브라우저 + SQL 편집기
- **`npm run db:studio`** — 로컬에서 Drizzle Studio(브라우저 GUI)로 조회·편집

---

## 🧪 로컬 검증 명령
```bash
npm run test     # Elo 엔진 유닛 테스트 (vitest)
npm run build    # 프로덕션 빌드 (타입·SSG 검증)
npm run dev      # 개발 서버 (인메모리 데이터로 전체 흐름 체험)
```

## 📌 남은 작업 요약
- [x] Neon DB 연결 + 스키마 push
- [x] `repo → Drizzle` 전환 (async, force-dynamic 렌더링, 영속성 검증 완료)
- [ ] Spotify 실 연동 (client credentials + Web Playback SDK)
- [ ] Giscus 실제 값 연결
- [ ] `ADMIN_KEY`/`JWT_SECRET`을 배포용 강한 값으로 교체
- [ ] Vercel 실제 배포
