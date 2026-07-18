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
            Last updated: 2026-07-18 (version 2026-07-18)
          </p>
        </header>

        {/* ------- Philosophy preamble ------- */}
        <section className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/40 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
            Our philosophy
          </p>
          <h2 className="display mt-2 text-2xl text-ink-900 sm:text-3xl">
            We weren't meant to live like this.
          </h2>
          <div className="prose prose-neutral mt-4 max-w-none text-ink-700">
            <p>
              Somewhere along the way, we forgot how to live with each other.
              We turned neighbors into strangers, skills into subscriptions,
              and time itself into something we rent back from people who
              produce nothing. We pay for the privilege of working, and we
              work to afford the things that were meant to make work bearable.
            </p>
            <p>
              That isn't an economy. That's a cage with a screen in it. A
              system designed to convince you that what's natural — helping
              a neighbor, fixing your own car, growing your own food, trading
              with someone you actually know — is somehow inefficient,
              backward, or quaint. Meanwhile the people who own the cage post
              record profits.
            </p>
            <p>
              <strong>unscrewed.lol exists to wake people up</strong>, gently,
              by giving them a place to remember that another way is possible.
              That a haircut can pay for a tune-up. That a guitar lesson can
              pay for a tomato harvest. That your time, your skills, and the
              things sitting in your garage are worth something to someone
              within walking distance — and that exchange between humans does
              not require a corporation, a payment processor, or a permission
              slip from an algorithm.
            </p>
            <p>
              We believe community is not something the government delivers
              or a brand sponsors. It's something we build with our own hands,
              one trade at a time. We believe the dollar is a tool, not a
              master. We believe the people who run things will not save us —
              and we can save each other.
            </p>
            <p>
              If you're reading this, you already feel it. The whole system
              has been quietly draining your time, your money, your trust,
              and your hope. You're not crazy. You're awake. Welcome.
            </p>
            <p className="text-sm italic text-ink-500">
              The legal text below is here because we live in a world that
              still requires it. The philosophy above is why we built any of
              this in the first place. Both matter.
            </p>
          </div>
        </section>

        <div className="prose prose-neutral mt-10 max-w-none text-ink-700">
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

          <h2>9. Prohibited content and conduct</h2>
          <p>
            You may not post, upload, list, offer, request, describe, transmit,
            store, or link to any of the following through the Service. This is
            a non-exhaustive list; use judgment.
          </p>
          <ul>
            <li>
              <strong>Any sexual content involving a minor</strong>, real or
              simulated, drawn or photographed, in any form. This includes
              child sexual abuse material (CSAM) as defined by 18 U.S.C.
              § 2256 and analogous laws. We report all such content to the
              National Center for Missing &amp; Exploited Children (NCMEC) as
              required by 18 U.S.C. § 2258A and preserve associated records
              for law enforcement.
            </li>
            <li>
              Pornography, nudity, sexually explicit material, or sexual
              services of any kind. unscrewed.lol is not an adult platform.
            </li>
            <li>
              Content that facilitates human trafficking, forced labor,
              commercial sexual exploitation, or the smuggling of persons.
            </li>
            <li>
              Content depicting graphic violence, gore, animal cruelty, or the
              incitement or promotion of self-harm or suicide.
            </li>
            <li>
              Terrorism, violent extremism, credible threats of violence, or
              content that promotes designated terrorist organizations.
            </li>
            <li>
              Harassment, targeted abuse, doxxing (posting another person's
              private contact, address, or identifying information without
              consent), or hate speech attacking people based on protected
              characteristics.
            </li>
            <li>
              Trading in firearms, ammunition, explosives, controlled
              substances, prescription drugs, tobacco or vape products to
              minors, unregistered wildlife, human remains or organs, stolen
              goods, counterfeit currency or documents, or any other item
              whose sale, transfer, or possession is restricted by federal,
              state, or local law where either party is located.
            </li>
            <li>
              Financial fraud, identity theft, phishing, malware, or any
              scheme designed to deceive another user into transferring money,
              cryptocurrency, or personal data outside a legitimate trade.
            </li>
            <li>
              Content that infringes another person's copyright, trademark,
              trade secret, right of publicity, or other intellectual-property
              or privacy right.
            </li>
            <li>
              Sexually suggestive or exploitative content involving any
              identifiable person posted without their explicit consent,
              including so-called "revenge" or non-consensual intimate imagery.
            </li>
            <li>
              Impersonation of another person, business, or public official,
              or misrepresentation of your affiliation with any organization.
            </li>
            <li>
              Spam, bulk unsolicited postings, artificially inflated listings,
              or use of the Service to farm engagement, referrals, or reports.
            </li>
          </ul>
          <p>
            <strong>Enforcement.</strong> We use a combination of user reports,
            automated classifiers (including machine-learning models applied to
            text and images), and third-party scanning (including Cloudflare's
            CSAM Scanning Tool) to detect prohibited content. Content flagged
            by three or more independent users may be auto-hidden pending human
            review. We may remove content, suspend or terminate accounts, and
            report unlawful activity to law enforcement without prior notice.
            Suspected CSAM is preserved and reported to NCMEC as required by
            law.
          </p>
          <p>
            <strong>Reports.</strong> Any signed-in user can flag a listing,
            blog post, or account by clicking the "Report" affordance on that
            item. Reports are confidential. If you have information about
            suspected CSAM, please also report it directly to{" "}
            <a
              href="https://report.cybertip.org/"
              target="_blank"
              rel="noreferrer"
            >
              NCMEC's CyberTipline
            </a>
            .
          </p>

          <h2>10. Age of eligibility</h2>
          <p>
            The Service is intended for adults. By creating an account you
            represent and warrant that you are at least <strong>18 years of
            age</strong> (or the age of majority in your jurisdiction, if
            higher) and legally competent to enter into these Terms. Accounts
            found to belong to minors will be terminated. We do not knowingly
            collect personal information from anyone under 18; if you believe
            a minor has created an account, contact us via the Report affordance
            on their profile or listing and we will investigate promptly.
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
