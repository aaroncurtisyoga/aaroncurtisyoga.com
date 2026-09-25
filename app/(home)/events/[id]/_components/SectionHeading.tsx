import { FC, ReactNode } from "react";

/** The event page's section titles, in the homepage's serif. */
const SectionHeading: FC<{ children: ReactNode }> = ({ children }) => (
  <h2 className="mb-3 font-cormorant text-[clamp(26px,2.6vw,32px)] font-normal">
    {children}
  </h2>
);

export default SectionHeading;
