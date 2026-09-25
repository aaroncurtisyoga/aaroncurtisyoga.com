import { EventWithLocationAndCategory } from "@/app/_lib/types";

const MOCK_CATEGORIES = [
  { id: "mock-cat-1", name: "Vinyasa" },
  { id: "mock-cat-2", name: "Yin" },
  { id: "mock-cat-3", name: "Hatha" },
  { id: "mock-cat-4", name: "Workshop" },
  { id: "mock-cat-5", name: "Meditation" },
];

const MOCK_LOCATIONS = [
  {
    id: "mock-loc-1",
    name: "Yoga Studio Downtown",
    formattedAddress: "123 Main St, Washington, DC 20001",
    placeId: "mock-place-1",
    lat: 38.9072,
    lng: -77.0369,
  },
  {
    id: "mock-loc-2",
    name: "Community Center",
    formattedAddress: "456 Oak Ave, Arlington, VA 22201",
    placeId: "mock-place-2",
    lat: 38.8816,
    lng: -77.0909,
  },
  {
    id: "mock-loc-3",
    name: "Park Pavilion",
    formattedAddress: "789 Park Rd, Bethesda, MD 20814",
    placeId: "mock-place-3",
    lat: 38.9847,
    lng: -77.0947,
  },
];

const MOCK_TITLES = [
  "Morning Flow",
  "Gentle Stretch",
  "Power Vinyasa",
  "Sunset Yin",
  "Breathwork & Meditation",
  "All Levels Hatha",
  "Core Strength Flow",
  "Restorative Yoga",
  "Yoga for Runners",
  "Candlelit Yin",
  "Weekend Workshop: Inversions",
  "Beginner Basics",
  "Dynamic Flow",
  "Slow Flow",
  "Midday Reset",
  "Evening Unwind",
  "Saturday Morning Flow",
  "Sunday Restore",
  "Yoga Foundations",
  "Advanced Asana",
];

export function generateMockEvents(
  count: number = 20,
): EventWithLocationAndCategory[] {
  const now = new Date();
  const events: EventWithLocationAndCategory[] = [];

  for (let i = 0; i < count; i++) {
    // Spread events over the next 30 days
    const daysFromNow = Math.floor(i / 2) + 1;
    const hour = i % 2 === 0 ? 9 : 18; // Morning or evening classes

    const startDateTime = new Date(now);
    startDateTime.setDate(startDateTime.getDate() + daysFromNow);
    startDateTime.setHours(hour, 0, 0, 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (i % 4 === 3 ? 90 : 60)); // Most are 60min, some 90min

    const category = MOCK_CATEGORIES[i % MOCK_CATEGORIES.length];
    const location = MOCK_LOCATIONS[i % MOCK_LOCATIONS.length];
    const isFree = i % 5 === 0; // Every 5th event is free

    events.push({
      id: `mock-event-${i + 1}`,
      isActive: true,
      createdAt: now,
      description: `A ${category.name.toLowerCase()} class perfect for all levels. Join us for a rejuvenating practice.`,
      endDateTime,
      externalRegistrationUrl: null,
      imageUrl: null,
      isFree,
      isFeatured: false,
      isHostedExternally: false,
      maxAttendees: isFree ? null : 20,
      price: isFree ? null : "15",
      startDateTime,
      title: MOCK_TITLES[i % MOCK_TITLES.length],
      categoryId: category.id,
      category,
      locationId: location.id,
      location,
      sourceType: null,
      sourceId: null,
      externalUrl: null,
      lastSynced: null,
      isExternal: false,
      googleEventId: null,
      googleEventLink: null,
    });
  }

  // One starred workshop, so the homepage's featured section has something to
  // show. Taught at a studio with walk-in tickets, like the real ones.
  const featuredStart = new Date(now);
  featuredStart.setDate(featuredStart.getDate() + 19);
  featuredStart.setHours(20, 0, 0, 0);
  const workshop = MOCK_CATEGORIES[3];
  const studio = MOCK_LOCATIONS[0];
  events.push({
    ...events[0],
    id: "mock-event-featured",
    description:
      "<p><strong>Not a member? Just come.</strong> Buy a $15 ticket at the front desk, any time up to 30 minutes before we start. No need to book ahead.</p><p><strong>Members:</strong> free. Sign up the way you'd book any other class at the gym.</p><p>Part of the studio's monthly Wellbeing Wednesdays series.</p>",
    startDateTime: featuredStart,
    endDateTime: new Date(featuredStart.getTime() + 60 * 60 * 1000),
    isFree: false,
    isFeatured: true,
    isHostedExternally: true,
    maxAttendees: 30,
    price: "15",
    title: "Stretch & Soundbath",
    categoryId: workshop.id,
    category: workshop,
    locationId: studio.id,
    location: studio,
  });

  return events;
}
