import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight">
        Trade what you have for what you need.
      </h1>
      <p className="mt-6 text-lg text-neutral-600 max-w-2xl mx-auto">
        unscrewed.lol is a barter marketplace. No middlemen, no corporate fees —
        just neighbors swapping goods and services. Negotiate a fair deal, sign
        a simple social contract, and trade.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Link
          to="/browse"
          className="rounded-md bg-brand text-white px-5 py-3 hover:bg-brand-dark"
        >
          Browse trades nearby
        </Link>
        <Link
          to="/signup"
          className="rounded-md border border-neutral-300 px-5 py-3 hover:border-brand hover:text-brand"
        >
          Post your own
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
        <Feature
          title="No money required"
          body="Swap goods, services, time, or skills. Lawn care for piano lessons. Old guitar for a babysitter."
        />
        <Feature
          title="Social contracts"
          body="Negotiate the terms in chat. When you agree, both parties sign — it's your deal, not the platform's."
        />
        <Feature
          title="SMS-verified accounts"
          body="Every trader verifies a real phone. KYC and reputation are coming next."
        />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <h3 className="font-semibold text-brand">{title}</h3>
      <p className="mt-2 text-sm text-neutral-600">{body}</p>
    </div>
  );
}
