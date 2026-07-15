import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostPage } from "@/components/PostPage";
import { DEFAULT_POSTS } from "@/lib/posts";
import { getPostBySlug } from "@/lib/store";

export function generateStaticParams() {
  return DEFAULT_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPostBySlug(params.slug, { onlyPublished: true });
  if (!post) return {};
  return { title: post.metaTitle || post.title, description: post.metaDescription || post.dek };
}

export default async function ActualidadPostRoute({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug, { onlyPublished: true });
  if (!post) notFound();
  return <PostPage post={post} />;
}
