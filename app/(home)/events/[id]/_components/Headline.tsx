import { FC } from "react";

interface HeadlineProps {
  title: string;
}
const Headline: FC<HeadlineProps> = ({ title }) => {
  return (
    <h1 className="max-w-[18ch] font-cormorant text-[clamp(48px,7vw,96px)] font-normal leading-[0.95] tracking-[-0.02em] text-balance">
      {title}
    </h1>
  );
};

export default Headline;
