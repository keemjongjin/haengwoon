// next/image로 최적화할 외부 이미지 호스트의 단일 출처.
// next.config.ts(images.remotePatterns)와 MdxImage(글 본문 이미지가 이 목록 밖 호스트면
// next/image 대신 평범한 <img>로 안전하게 폴백)가 이 배열을 함께 참조한다 — 두 군데에
// 같은 목록을 따로 적어두면 언젠가 하나만 고치고 잊어버리기 쉬워서 하나로 합쳤다.
export const ALLOWED_IMAGE_HOSTS = ["i.scdn.co", "placehold.co"];
