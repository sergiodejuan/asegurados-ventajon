import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostPage } from "@/components/PostPage";
import { POSTS, getPost } from "@/lib/posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};
  return { title: post.metaTitle, description: post.metaDescription };
}

export default function ActualidadPostRoute({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();
  return <PostPage post={post} />;
}
