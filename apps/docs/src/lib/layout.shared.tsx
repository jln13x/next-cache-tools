import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/jln13x/next-cache-tools",
    nav: {
      title: "next-cache-tools",
    },
    links: [
      {
        icon: "⚙️",
        text: "Report a Bug",
        url: "https://x.com/jlndev",
      },
    ],
  };
}
