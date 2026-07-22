import { KROGER_URL } from "@/lib/grocery/kroger";

export default function ShopKrogerButton() {
  return (
    <a
      href={KROGER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full bg-canyon px-4 py-2 font-bold text-white"
    >
      Shop at Kroger
    </a>
  );
}
