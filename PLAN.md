# 🗺️ PLAN — Two Worlds: Tech & Music Sync

> 실행 계획서. 확정된 결정의 근거·이력은 [`DECISIONS.log`](./DECISIONS.log), 원 기획은 [`README.md`](./README.md) 참고.
> 디자인 시안: [`design-preview.html`](./design-preview.html)

---

## 1. 개요
하나의 사이트에서 로고 클릭으로 **💻 Tech(기술 블로그)** ↔ **🎵 Music(음악 아카이브)** 모드를 전환하는 개인 포트폴리오.
운영비를 최소화하기 위해 **조회는 정적/캐시, 쓰기만 서버리스(scale-to-zero)** 로 설계한다.

---

## 2. 확정 스택 & 아키텍처

| 레이어 | 선택 |
|---|---|
| 프레임워크 | **Next.js (App Router)** + TypeScript |
| 스타일 | Tailwind CSS |
| ORM / DB | **Drizzle** / **Neon Postgres** (관계형, scale-to-zero) |
| 배포 | **Vercel** (Hobby, 무료) |
| 인증 | `ADMIN_KEY` 단일 패스워드 → JWT |
| Tech 콘텐츠 | **MDX 파일** (레포 내, `git push` 반영) — DB CRUD로 전환했다가 다시 되돌림(아래 참고) |
| 음악 메타 | **Spotify Web API** 수집 → 로컬 DB 영구 캐싱 |
| 음악 재생 | Spotify Web Playback SDK (관리자 전용, **키 없으면 mock**) |

**철학:** 조회(블로그·리더보드·아카이브)는 정적/캐시로 서빙 → 유휴 비용 ≈ $0.
쓰기(로그인·앨범등록·월드컵 투표·댓글·좋아요)만 API Route(서버리스)로 처리.

---

## 3. 폴더 / 라우트 구조 (App Router)

```
app/
  layout.tsx                 # 헤더(로고 토글·nav·다크토글) + footer(관리자 링크·소셜링크) + VisitorPing
  page.tsx                   # 💻 Tech 홈 (/) — 최근 글 (MDX 파일, SSG)
  posts/
    page.tsx                 # 발췌형 목록 + 카테고리 탭 + 페이지네이션 (MDX, 정적)
    [slug]/page.tsx          # 글 상세 (TOC, SSG generateStaticParams)
  projects/
    page.tsx  [slug]/page.tsx  # 프로젝트도 MDX 파일(정적)
  resume/page.tsx            # 스크램블 텍스트 효과
  search/page.tsx            # 클라이언트 검색 (MDX 파일 기반 인덱스, 정적)
  music/
    page.tsx                 # 랜딩: 최근 리뷰 히어로 → 스크롤 시 리더보드(1년)
    leaderboard/page.tsx     # 두 탭: 평점순 / 취향대결(Elo)순
    archive/page.tsx         # 리뷰일/발매일 기준 전환 + 연도·장르 필터
    insights/page.tsx        # 평점 vs Elo 불일치 시각화
    album/[id]/page.tsx      # 앨범 상세: 두 점수·Spotify 임베드·최애·댓글·좋아요
    admin/page.tsx           # 구 경로 — /admin/music 으로 redirect
  admin/                     # 🔒 통합 관리자 (AdminGate로 보호)
    layout.tsx  page.tsx(Overview)
    posts/page.tsx            # 읽기전용: 글 목록 + 프론트매터 템플릿 안내 (CRUD 없음, git push로 작성)
    music/page.tsx            # 월드컵·검색등록·평점입력
    comments/page.tsx         # 댓글 모더레이션
  api/
    auth/route.ts            # GET(상태) · POST(로그인) · DELETE(로그아웃)
    albums/route.ts  albums/[id]/rating/route.ts
    match/route.ts  match/vote/route.ts
    comments/route.ts  likes/route.ts  tracks/favorite/route.ts
    spotify/authorize  spotify/callback  spotify/search
    admin/stats  admin/spotify-status  admin/comments  admin/comments/[id]
    track/route.ts           # 방문자 기록 (공개)
    backup/route.ts          # 음악 데이터만(블로그는 git이 백업)
  rss.xml/route.ts
content/  posts/*.mdx  projects/*.mdx     # 블로그·프로젝트 모두 파일 (git push로 발행)
components/  common/  blog/  project/  music/  resume/  features/  admin/
lib/  db/(schema,repo,client)  posts.ts(fs+gray-matter)  elo.ts  spotify.ts  auth.ts  spam.ts  hash.ts  search.ts
```

> ★ 블로그는 한때 DB(posts 테이블) CRUD로 전환했다가, 개발자 워크플로우(에디터+git)에 더 맞는다는
> 판단으로 **MDX 파일 방식으로 되돌림**. 상세 근거는 DECISIONS.log 참고.

---

## 4. DB 스키마 (Drizzle / Postgres)

- **`Album`**: `id(PK)`, `spotify_album_id?`(매칭 전 null), `lastfm_id?`, `title`, `artist`,
  `cover_image_url`, `release_date`, `review_date`, `genre`,
  `manual_rating?`(0~10, 내가 지정 = **공식 점수**), `elo_rating`(기본 1500), `match_count`(기본 0), `created_at`
- **`Track`**: `id(PK)`, `album_id(FK)`, `spotify_track_id`, `title`, `track_number`, `is_favorite`, `elo_rating`(기본 1500)
- **`Comment`**: `id(PK)`, `target_type`(album|post), `target_id`, `author_name`, `password_hash`, `content`, `is_hidden`, `created_at`
- **`Match`**(Elo 투표 로그): `id(PK)`, `album_a_id`, `album_b_id`, `winner_id`, `created_at`
- **`Like`**: `id(PK)`, `target_type`, `target_id`, `count` (또는 이벤트 로그)

> 블로그/프로젝트 글은 DB가 아니라 **MDX 파일**. 프론트매터 스키마:
> `title, description, pubDate, updatedDate?, heroImage?, category(필수), tags[]`

---

## 5. 핵심 로직 명세

### 5.1 평점 ⟂ Elo — 완전 분리 (★)
- **평점(`manual_rating`)** = 내가 지정하는 절대 점수(0~10, 화면 표시 = 공식).
- **Elo(`elo_rating`)** = 월드컵 맞대결로 산출되는 상대적 선호.
- 서로 **덮어쓰지 않음.** 리더보드는 **두 탭**(평점순 / Elo순), 앨범 상세엔 둘 다 표시.
- 두 점수의 불일치는 **버그가 아니라 콘텐츠** → `/music/insights`에 "평점과 Elo가 가장 다른 앨범 TOP5" 지표로 노출(강제 편집 X).

### 5.2 앨범 월드컵 (관리자 전용)
- `/music/admin`에서만 접근. 매치업 2개 추출 → Spotify 재생(mock 가능) → 승자 투표 → `Match` 기록 + 양쪽 Elo 재계산(`match_count++`).
- 방문자에겐 월드컵/투표 UI 미노출. footer의 관리자 로그인(ADMIN_KEY→JWT) 통과 시에만.

### 5.3 리더보드 (1년 기준)
- 최근 12개월 리뷰 앨범 대상. 탭 전환: 평점순 ↔ Elo순. Music 랜딩 하단에도 노출.

### 5.4 댓글
- 💻 **Tech**: Giscus(GitHub Discussions) — DB 불필요.
- 🎵 **Music**: DB 익명 댓글 + **스팸방어**(허니팟 → 제출시간 → 레이트리밋 → 콘텐츠 휴리스틱 → 관리자 삭제; 필요시 Turnstile).

### 5.5 Spotify (키 없이 개발)
- `lib/spotify.ts`를 인터페이스로 추상화. env 없으면 mock, 있으면 실호출. 재생 버튼은 미연결 시 비활성.
- 나중에 env만 채우면 코드 수정 없이 실연동.

---

## 6. 13주 Epic 로드맵

- **Epic 1 (1~2주) 세팅** — Next.js+TS+Tailwind, Neon+Drizzle 스키마, 라우팅 뼈대,
  헤더/footer(로고 토글·다크·관리자 로그인·소셜링크), 4테마, env 체계, Spotify mock 골격.
- **Epic 2 (3~4주) Tech 모드** ✅완료 — MDX(Posts/Projects), 발췌형 목록+카테고리 탭+페이지네이션,
  상세+TOC, 검색(클라이언트 인덱스; 추후 Pagefind), RSS, 읽는시간, About, 이력서 스크램블,
  Giscus(값 대기), 코드 하이라이트(shiki 듀얼).
- **Epic 3 (5~7주) Music 코어** 🟡뼈대완료(인메모리) — 관리자 인증, Elo 엔진(+Vitest 8),
  match/vote·albums·backup API, Spotify mock. 잔여: DB 연결 시 repo→Drizzle, Spotify 실연동, 평점입력 UI.
- **Epic 4 (8~10주) Music 프론트** 🟡뼈대완료 — 랜딩(최근 리뷰 히어로→스크롤 리더보드),
  리더보드 두 탭(1년), 월드컵(관리자 전용·mock 재생), 최애 🔥 토글, 앨범 상세(두 점수).
  잔여: Spotify Web SDK 실 재생(키 확보 시).
- **Epic 5 (11~12주) 소셜·시각화** ✅완료(인메모리) — 익명 댓글+스팸방어(허니팟·시간·레이트리밋·휴리스틱),
  좋아요, Insights(평점 vs Elo 불일치 CSS 바), 아카이브 필터(연도/장르).
- **Epic 6 (13주) 마감·배포** 🟡준비완료 — 유닛테스트·프로덕션 빌드 통과. 배포 가이드=DEPLOY.md.
  실제 배포는 사용자 자격증명(Neon/Vercel/Spotify) + repo→Drizzle 전환 필요.

**Backlog(v2.0):** 수록곡 월드컵(독립 리그, `Track` 1:N 재활용) — "인생 명곡 Top 100".

---

## 7. 환경변수

```
DATABASE_URL=            # Neon Postgres
ADMIN_KEY=               # 관리자 단일 패스워드
JWT_SECRET=
SPOTIFY_CLIENT_ID=       # 앨범 메타(client credentials) + 재생. 미보유 → 비우면 mock 동작
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REFRESH_TOKEN=   # 관리자 프리미엄 재생용
NEXT_PUBLIC_GISCUS_REPO= # + category 등 Giscus 설정
# (추후) UPSTASH_REDIS_URL / TURNSTILE_* — 스팸 심화 시
```

---

## 8. 착수 전 남은 열린 항목
1. **디자인 세부** — 히어로 문구, 고양이 디테일, 폰트(GmarketSans?) → 나중에.
2. **레이아웃 preview 반영** — 관리자 로그인·소셜링크 footer 이동, Music 랜딩 스크롤 구조 → 요청 시 design-preview.html 갱신.
3. **Elo 표시 환산·임계값** — 불일치 지표용 표시 규칙 최종화(현재 임시: elo/180, 차이≥1.5·대결≥5).
4. **Giscus 설정** — repo/category 등 실제 값은 나중에 연결(Epic 2 UI는 준비, 값만 대기).
