import Script from "next/script";

export const Analytics = () => {
  if (process.env.NODE_ENV === "development") return null;

  return null;

  // return (
  //   <Script
  //     async
  //     src="/u/script.js"
  //   />
  // );
};
