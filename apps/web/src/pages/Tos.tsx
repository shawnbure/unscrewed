import { Container } from "../ui/Container.js";

export default function Tos() {
  return (
    <Container size="sm" className="py-10">
      <div className="card p-8 sm:p-10">
        <header>
          <p className="text-xs uppercase tracking-widest text-brand-700">
            Terms of Service
          </p>
          <h1 className="mt-1 text-3xl font-bold text-ink-900">
            The rules of the road
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Last updated: 2026-05-28 (version 2026-05-28)
          </p>
        </header>

        <div className="prose prose-neutral mt-8 max-w-none text-ink-700">
          <h2>1. What unscrewed.lol is</h2>
          <p>
            unscrewed.lol ("the Service") is a venue for users to discover one
            another and propose, negotiate, and document barter exchanges of
            goods and services ("Trades"). The Service is a communications and
            record-keeping platform only. We are not a party to any Trade.
          </p>

          <h2>2. You are responsible for your Trades</h2>
          <p>
            You agree that all Trades are conducted at your own risk between you
            and the other party. You are responsible for: verifying the identity
            and trustworthiness of the other party; the legality, condition, and
            ownership of any item or service you offer or receive; complying
            with all applicable tax, customs, and licensing laws; and arranging
            meet-ups, exchange, and delivery safely.
          </p>

          <h2>3. No warranty, no agency</h2>
          <p>
            The Service is provided "AS IS" and "AS AVAILABLE", without
            warranties of any kind, express or implied, including but not
            limited to merchantability, fitness for a particular purpose,
            non-infringement, and uninterrupted operation. We do not act as your
            agent, broker, escrow, fiduciary, or attorney.
          </p>

          <h2>4. Indemnification</h2>
          <p>
            To the maximum extent permitted by law, you agree to defend,
            indemnify, and hold harmless unscrewed.lol, its owners, operators,
            officers, contractors, and affiliates from and against any and all
            claims, damages, obligations, losses, liabilities, costs, and
            expenses (including reasonable attorneys' fees) arising from or
            related to: (a) your use of the Service; (b) any Trade you enter
            into or attempt to enter into through the Service; (c) any content
            you post; (d) your violation of these Terms; or (e) your violation
            of any applicable law or the rights of any third party.
          </p>

          <h2>5. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, in no event shall
            unscrewed.lol be liable for any indirect, incidental, special,
            consequential, or punitive damages, or any loss of profits, revenue,
            data, or use, whether in contract, tort, or otherwise, arising out
            of your use of the Service. Our aggregate liability shall not exceed
            one hundred U.S. dollars ($100).
          </p>

          <h2>6. Future features</h2>
          <p>
            We may add features such as reputation scoring, identity
            verification (KYC), background checks, dispute mediation, and
            escrow-style holding of consideration. Such features may carry
            additional terms, fees, and consents at the time they are offered.
          </p>

          <h2>7. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for any reason,
            including violation of these Terms.
          </p>

          <h2>8. Governing law</h2>
          <p>
            These Terms are governed by the laws of the United States and the
            state in which the Service's operator is principally located,
            without regard to conflict-of-law principles.
          </p>
        </div>

        <footer className="mt-8 rounded-xl bg-sand-100 p-4 text-sm text-ink-700">
          By creating an account you accept these Terms in their entirety,
          including <strong>Section 4 (Indemnification)</strong> and{" "}
          <strong>Section 5 (Limitation of Liability)</strong>.
        </footer>
      </div>
    </Container>
  );
}
