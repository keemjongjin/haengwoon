import { getVisiblePosts, getCategories } from "@/lib/posts";
import { PostList } from "@/components/blog/PostList";

export const metadata = { title: "Posts — Haengwoon" };
export const dynamic = "force-dynamic"; // 숨김 여부는 DB 조회 → 매 요청 최신화

export default async function PostsPage() {
  const posts = await getVisiblePosts();
  const categories = getCategories();

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Posts</h1>
        <p className="mt-1 text-sm text-mut">{posts.length} posts</p>
      </div>
      <PostList posts={posts} categories={categories} />
    </div>
  );
}
