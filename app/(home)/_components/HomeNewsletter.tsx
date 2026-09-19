import HomeNewsletterForm from "./HomeNewsletterForm";

export default function HomeNewsletter() {
  return (
    <section
      id="newsletter"
      data-testid="home-newsletter"
      className="mx-gutter mb-[clamp(32px,4vw,56px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-[clamp(24px,4vw,56px)] rounded-[28px] bg-sand-deep p-[clamp(28px,4vw,56px)]"
    >
      <div>
        <h2 className="mb-2.5 font-cormorant text-[clamp(34px,3.5vw,44px)] font-normal">
          Stay in touch
        </h2>
        <p className="leading-[1.5] text-ink-muted text-pretty">
          One short email a month: what I’m teaching, where to find me, and one
          small thing to take onto the mat.
        </p>
      </div>
      <HomeNewsletterForm />
    </section>
  );
}
