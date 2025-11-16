import Script from "next/script";

export const Analytics = () => {
  if (process.env.NODE_ENV === "development") return null;

  return (
    <Script
      async
      data-website-id="6612ef9b-277d-4a37-ac1f-de7a39cc6f03"
      src="/u/script.js"
    />
  );
};
