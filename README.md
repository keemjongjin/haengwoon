# 🎵 Two Worlds — Tech & Music Sync

> 로고 클릭 하나로 **💻 기술 블로그**와 **🎵 음악 아카이브**를 오가는 개인 포트폴리오 플랫폼.
> 조회는 정적·캐시, 쓰기만 서버리스로 처리해 **운영비를 최소화**하도록 설계했습니다. (v1.0)

---

## ✨ 주요 기능

### 💻 Tech 모드 (`/`)
- 블로그 글은 **MDX 파일**(`content/posts/`) + `git push`로 발행 — 버전관리 공짜, 에디터로 바로 작성
- 발췌형 목록 + 카테고리 탭 + 페이지네이션
- 글 상세: 목차(ToC) · 읽는 시간 · 태그 · **코드 문법 강조**(shiki 라이트/다크)
- 전문 검색 · RSS 피드 · 이력서(스크램블 디코딩 효과)
- 댓글: **Giscus**(GitHub Discussions)

### 🎵 Music 모드 (`/music`)
- 랜딩: **가장 최근 리뷰 앨범**을 정면에 → 스크롤 시 리더보드
- **앨범 월드컵**(Elo 레이팅) — 관리자 전용, 맞대결로 취향 순위 산출
- 리더보드 **두 탭**: `평점 랭킹`(내 점수) ⟂ `취향 대결`(Elo) — 서로 다른 지표
- 앨범 상세: 두 점수 · 수록곡 최애(🔥) · 좋아요
- 아카이브: **리뷰일/발매일 기준** 전환 + 연도·장르 필터
- Insights: **평점 vs Elo 불일치** 시각화
- 익명 댓글 + 스팸 방어(허니팟·제출시간·레이트리밋·콘텐츠 휴리스틱)

### 🎨 공통
- **4 테마**: 모드(Tech/Music) × 라이트/다크 독립 전환
- 관리자 인증: 단일 `ADMIN_KEY` → JWT (footer에 은밀히)

### 🔒 통합 관리자 (`/admin`)
- **Overview**: 글·앨범·댓글·방문자 통계, 최근 활동, Spotify 연결 상태 체크, 빠른 링크(Neon 콘솔·백업)
- **Posts**: 글 목록 확인 + 프론트매터 템플릿 안내 (작성 자체는 로컬에서 파일로 → git push)
- **Music**: Spotify 검색으로 앨범 등록, 평점 입력, 앨범 월드컵
- **Comments**: 전체 댓글 모아보기 + 숨김/삭제
- 방문자 카운터는 외부 서비스 없이 자체 DB 집계

---

## 🛠 기술 스택
| 레이어 | 사용 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) · React 19 · TypeScript |
| 스타일 | Tailwind CSS v4 |
| 콘텐츠 | 블로그·프로젝트 모두 MDX 파일 (`next-mdx-remote`, `rehype-pretty-code`) |
| DB / ORM | Neon (PostgreSQL) · Drizzle |
| 인증 | `jose` (JWT) |
| 음악 | Spotify Web API + Playback SDK *(키 확보 시, 없으면 mock)* |
| 테스트 | Vitest |
| 배포 | Vercel |

---

## 🚀 빠른 시작

```bash
npm install
cp .env.example .env.local   # 값 채우기 (개발은 기본값으로도 동작)

npm run dev      # 개발 서버 (인메모리 데이터로 전체 흐름 체험)
npm run test     # Elo 엔진 유닛 테스트
npm run build    # 프로덕션 빌드
```

- 개발 서버는 `http://localhost:3000`
- 통합 관리자 페이지 `/admin` — 개발 기본 키: `dev-admin-key`

---

## 📁 프로젝트 구조
```
app/                # 라우트
  posts/ projects/ resume/ search/                 # Tech
  music/ (leaderboard·archive·insights·album/[id])  # Music
  admin/ (posts[읽기전용]·music·comments)            # 🔒 통합 관리자
  api/   (albums·match·comments·likes·spotify·admin·track·backup)
components/  common/ blog/ music/ resume/ features/ admin/
content/     posts/*.mdx  projects/*.mdx    # 블로그·프로젝트 모두 파일 (git push로 발행)
lib/         elo · auth · spam · hash · spotify · mdx · posts · db(repo·schema)
```

---

## 📦 상태 (v1.0)
- **Epic 1~5 구현 완료 + Neon DB 연결 완료 + 통합 관리자(/admin) 구현 완료.**
  음악 데이터는 Drizzle + Neon 기반으로 동작하며, 서버 재시작·재배포에도 유지됩니다.
- 블로그(Posts)는 **MDX 파일 + git push** 방식 — 로컬 에디터로 쓰고 버전관리도 공짜로 따라옵니다.
- 남은 것: Vercel 실배포, Spotify/Giscus 실 키 연결. 자세한 절차는 [`DEPLOY.md`](./DEPLOY.md) 참고.

---

## 📚 문서
- [`PLAN.md`](./PLAN.md) — 전체 설계·13주 로드맵·DB 스키마·핵심 로직
- [`DECISIONS.log`](./DECISIONS.log) — 모든 의사결정 이력(근거·번복 포함)
- [`DEPLOY.md`](./DEPLOY.md) — 배포 절차 및 남은 작업
- [`design-preview.html`](./design-preview.html) — 초기 디자인 시안 (정적)
