import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/jln13x/next-cache-tools",
    nav: {
      title: <Logo />,
      url: "/",
    },
    links: [
      {
        text: "Contact the Dev",
        url: "https://x.com/jlndev",
      },
    ],
  };
}
