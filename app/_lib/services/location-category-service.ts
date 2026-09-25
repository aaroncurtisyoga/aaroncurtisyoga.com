import prisma from "@/app/_lib/prisma";

interface LocationData {
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export class LocationCategoryService {
  private locationCache: Map<string, string> = new Map();
  private categoryCache: Map<string, string> = new Map();

  async getLocationId(locationData: LocationData): Promise<string> {
    const cacheKey = locationData.name;

    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey)!;
    }

    let location = await prisma.location.findFirst({
      where: { name: cacheKey },
    });

    if (!location) {
      location = await prisma.location.create({
        data: locationData,
      });
    } else if (
      location.formattedAddress !== locationData.formattedAddress ||
      location.lat !== locationData.lat ||
      location.lng !== locationData.lng
    ) {
      // The values below are the source of truth for a synced studio, so a
      // corrected address reaches the stored row (and any duplicate rows
      // with the same name) on the next sync.
      await prisma.location.updateMany({
        where: { name: cacheKey },
        data: {
          formattedAddress: locationData.formattedAddress,
          lat: locationData.lat,
          lng: locationData.lng,
        },
      });
    }

    this.locationCache.set(cacheKey, location.id);
    return location.id;
  }

  async getCategoryId(categoryName: string): Promise<string> {
    const cacheKey = categoryName;

    if (this.categoryCache.has(cacheKey)) {
      return this.categoryCache.get(cacheKey)!;
    }

    let category = await prisma.category.findFirst({
      where: { name: cacheKey },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: cacheKey },
      });
    }

    this.categoryCache.set(cacheKey, category.id);
    return category.id;
  }

  // Predefined locations for convenience
  async getBrightBearLocationId(): Promise<string> {
    return this.getLocationId({
      name: "Bright Bear Yoga DC",
      formattedAddress: "1000 Florida Ave NE, Washington, DC 20002",
      lat: 38.9172,
      lng: -76.9834,
    });
  }

  async getDCBPLocationId(): Promise<string> {
    return this.getLocationId({
      name: "DC Bouldering Project",
      // The Eckington gym. The old value here pointed at the wrong
      // neighborhood, about three miles away.
      formattedAddress: "1611 Eckington Pl NE #150, Washington, DC 20002",
      lat: 38.9116,
      lng: -77.004,
    });
  }

  async getDefaultCategoryId(): Promise<string> {
    return this.getCategoryId("Yoga Class");
  }
}
