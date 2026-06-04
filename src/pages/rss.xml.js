import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );

  return rss({
    title: "Ben Schembri",
    description:
      "Write-ups from the rabbit holes. How things actually work under the abstractions, how I built what I built and why I made the choices I did, and notes and references for future-me.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `/posts/${post.id}/`,
    })),
  });
}
