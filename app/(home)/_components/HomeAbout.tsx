const VALUES = [
  {
    name: "Breath",
    blurb:
      "Every practice starts and ends here. When in doubt, come back to it.",
  },
  {
    name: "Move",
    blurb:
      "My flows lean power, and there’s always an option for where you’re at today.",
  },
  {
    name: "Sound",
    blurb: "Handpan, bowls, and a few quiet moments to integrate and return.",
  },
];

export default function HomeAbout() {
  return (
    <section
      id="about"
      data-testid="home-about"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-[clamp(32px,5vw,72px)] px-gutter py-[clamp(64px,9vw,120px)]"
    >
      <p className="font-cormorant text-[clamp(28px,3.2vw,40px)] leading-[1.2] text-pretty">
        Hey, I’m Aaron. I teach yoga around DC. Sunrise flows, power-leaning
        vinyasa, and lately a lot of sound: handpan, bowls, and live sound
        baths. Space to move, breathe, connect.
      </p>
      <dl className="grid content-start gap-7 text-base leading-[1.55] text-ink-muted">
        {VALUES.map((value) => (
          <div key={value.name} className="border-t border-line pt-[18px]">
            <dt className="mb-1 font-cormorant text-2xl font-medium leading-[normal] text-ink">
              {value.name}
            </dt>
            <dd>{value.blurb}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
