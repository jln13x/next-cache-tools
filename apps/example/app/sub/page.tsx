import Link from "next/link";

export default function SubPage() {
  return (
    <div>
      Subpage
      <Link href="/" className="text-blue-500">
        Home
      </Link>
    </div>
  );
}
