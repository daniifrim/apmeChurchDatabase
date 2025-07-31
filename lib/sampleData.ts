import type { InsertChurch } from '@shared/schema';

/**
 * Sample churches for development and testing
 */
export const sampleChurches: Omit<InsertChurch, 'createdBy'>[] = [
  {
    name: "Biserica Penticostală Betania",
    address: "Calea Victoriei 125",
    city: "București",
    county: "Bucharest",
    country: "Romania",
    latitude: "44.4268",
    longitude: "26.1025",
    pastor: "Pastor Ion Popescu",
    phone: "+40 21 234 5678",
    email: "contact@betania.ro",
    memberCount: 250,
    foundedYear: 1995,
    engagementLevel: "high",
    notes: "Active church with strong community programs",
  },
  {
    name: "Biserica Evanghelică Elim",
    address: "Str. Memorandumului 45",
    city: "Cluj-Napoca",
    county: "Cluj",
    country: "Romania",
    latitude: "46.7712",
    longitude: "23.6236",
    pastor: "Pastor Maria Ionescu",
    phone: "+40 264 123 456",
    email: "elim@cluj.ro",
    memberCount: 120,
    foundedYear: 2001,
    engagementLevel: "medium",
    notes: "Growing congregation with youth focus",
  },
  {
    name: "Biserica Creștină după Evanghelie",
    address: "Bulevardul Decebal 88",
    city: "Timișoara",
    county: "Timiș",
    country: "Romania",
    latitude: "45.7489",
    longitude: "21.2087",
    pastor: "Pastor Andrei Mureșan",
    phone: "+40 256 789 012",
    email: "contact@bce-timisoara.ro",
    memberCount: 180,
    foundedYear: 1990,
    engagementLevel: "high",
    notes: "Established church with regional outreach",
  },
  {
    name: "Biserica Penticostală Nazaret",
    address: "Str. Ștefan cel Mare 23",
    city: "Iași",
    county: "Iași",
    country: "Romania",
    latitude: "47.1585",
    longitude: "27.6014",
    pastor: "Pastor Elena Vasile",
    phone: "+40 232 345 678",
    memberCount: 85,
    foundedYear: 2010,
    engagementLevel: "low",
    notes: "Smaller congregation needing support",
  },
  {
    name: "Biserica Noua Viață",
    address: "Piața Unirii 12",
    city: "Brașov",
    county: "Brașov",
    country: "Romania",
    latitude: "45.6427",
    longitude: "25.5887",
    pastor: "Pastor Mihai Stoica",
    memberCount: 45,
    foundedYear: 2020,
    engagementLevel: "new",
    notes: "Recently planted church",
  }
];

/**
 * Create sample churches for a user (development only)
 */
export async function createSampleChurches(
  userId: string,
  storage: { getChurches: () => Promise<any[]>; createChurch: (church: any) => Promise<any> }
): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  try {
    // Check if sample churches already exist
    const existingChurches = await storage.getChurches();
    if (existingChurches.length === 0) {
      for (const church of sampleChurches) {
        await storage.createChurch({
          ...church,
          createdBy: userId,
        });
      }
      console.log("Sample churches created for development");
    }
  } catch (error) {
    console.log("Sample churches already exist or error creating:", error);
  }
}