import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertChurchSchema, insertVisitSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";

// Development mode bypass middleware
const devBypass: RequestHandler = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'development') {
    // Mock user for development
    req.user = {
      claims: {
        sub: 'dev-user-123',
        email: 'developer@apme.ro',
        first_name: 'Dev',
        last_name: 'User'
      }
    };
    req.isAuthenticated = () => true;
  }
  next();
};

// Session-based auth middleware for production
const sessionAuth: RequestHandler = (req: any, res: any, next: any) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    req.isAuthenticated = () => true;
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

// Helper to use dev bypass or session auth
const authMiddleware = process.env.NODE_ENV === 'development' ? devBypass : sessionAuth;

// Create sample churches for development
async function createSampleChurches(userId: string) {
  const sampleChurches = [
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
      engagementLevel: "high" as const,
      notes: "Active church with strong community programs",
      createdBy: userId
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
      engagementLevel: "medium" as const,
      notes: "Growing congregation with youth focus",
      createdBy: userId
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
      engagementLevel: "high" as const,
      notes: "Established church with regional outreach",
      createdBy: userId
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
      engagementLevel: "low" as const,
      notes: "Smaller congregation needing support",
      createdBy: userId
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
      engagementLevel: "new" as const,
      notes: "Recently planted church",
      createdBy: userId
    }
  ];

  try {
    // Check if sample churches already exist
    const existingChurches = await storage.getChurches();
    if (existingChurches.length === 0) {
      for (const church of sampleChurches) {
        await storage.createChurch(church);
      }
      console.log("Sample churches created for development");
    }
  } catch (error) {
    console.log("Sample churches already exist or error creating:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Simple login endpoint
  app.post('/api/auth/login', async (req: any, res) => {
    const { email, password } = req.body;
    
    // Check hardcoded credentials
    if (email === 'office@apme.ro' && password === 'admin 1234') {
      try {
        // Create or get admin user in database
        const adminUser = await storage.upsertUser({
          id: 'admin-user-001',
          email: 'office@apme.ro',
          firstName: 'APME',
          lastName: 'Admin',
          role: 'administrator',
          region: 'Romania'
        });

        // Create session
        req.session.user = {
          claims: {
            sub: 'admin-user-001',
            email: 'office@apme.ro',
            first_name: 'APME',
            last_name: 'Admin'
          }
        };
        
        // Create sample churches for admin user
        await createSampleChurches('admin-user-001');
        
        // Save session
        req.session.save((err: any) => {
          if (err) {
            return res.status(500).json({ message: 'Session save failed' });
          }
          res.json({ success: true });
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
      }
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Auth routes
  app.get('/api/auth/user', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      // Create dev user if not exists in development mode
      if (!user && process.env.NODE_ENV === 'development') {
        user = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          role: 'administrator',
          region: 'Bucharest'
        });
      }
      
      // Add sample churches for development (check every time)
      if (process.env.NODE_ENV === 'development') {
        await createSampleChurches(userId);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Churches routes
  app.get('/api/churches', authMiddleware, async (req: any, res) => {
    try {
      const { search, county, engagementLevel } = req.query;
      const churches = await storage.getChurches({
        search: search as string,
        county: county as string,
        engagementLevel: engagementLevel as string,
      });
      res.json(churches);
    } catch (error) {
      console.error("Error fetching churches:", error);
      res.status(500).json({ message: "Failed to fetch churches" });
    }
  });

  app.get('/api/churches/:id', authMiddleware, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const church = await storage.getChurchById(id);
      if (!church) {
        return res.status(404).json({ message: "Church not found" });
      }
      res.json(church);
    } catch (error) {
      console.error("Error fetching church:", error);
      res.status(500).json({ message: "Failed to fetch church" });
    }
  });

  app.post('/api/churches', authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const churchData = insertChurchSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const church = await storage.createChurch(churchData);
      
      // Create activity for church creation
      await storage.createActivity({
        churchId: church.id,
        userId,
        type: 'note',
        title: 'Church added to database',
        description: `Church ${church.name} was added to the database`,
        activityDate: new Date(),
      });
      
      res.status(201).json(church);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating church:", error);
      res.status(500).json({ message: "Failed to create church" });
    }
  });

  app.put('/api/churches/:id', authMiddleware, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if church exists
      const existingChurch = await storage.getChurchById(id);
      if (!existingChurch) {
        return res.status(404).json({ message: "Church not found" });
      }
      
      const churchData = insertChurchSchema.partial().parse(req.body);
      const updatedChurch = await storage.updateChurch(id, churchData);
      
      // Create activity for church update
      await storage.createActivity({
        churchId: id,
        userId,
        type: 'note',
        title: 'Church information updated',
        description: `Church details were updated`,
        activityDate: new Date(),
      });
      
      res.json(updatedChurch);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating church:", error);
      res.status(500).json({ message: "Failed to update church" });
    }
  });

  app.delete('/api/churches/:id', authMiddleware, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only administrators can delete churches
      if (user?.role !== 'administrator') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      await storage.deleteChurch(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting church:", error);
      res.status(500).json({ message: "Failed to delete church" });
    }
  });

  // Visits routes
  app.get('/api/churches/:id/visits', authMiddleware, async (req: any, res) => {
    try {
      const churchId = parseInt(req.params.id);
      const visits = await storage.getVisitsByChurch(churchId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.post('/api/churches/:id/visits', authMiddleware, async (req: any, res) => {
    try {
      const churchId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const visitData = insertVisitSchema.parse({
        ...req.body,
        churchId,
        visitedBy: userId,
      });
      
      const visit = await storage.createVisit(visitData);
      
      // Create activity for visit
      await storage.createActivity({
        churchId,
        userId,
        type: 'visit',
        title: 'Church visit completed',
        description: visitData.notes || 'Church visit was completed',
        activityDate: visitData.visitDate,
      });
      
      res.status(201).json(visit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating visit:", error);
      res.status(500).json({ message: "Failed to create visit" });
    }
  });

  // Activities routes
  app.get('/api/churches/:id/activities', authMiddleware, async (req: any, res) => {
    try {
      const churchId = parseInt(req.params.id);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getActivitiesByChurch(churchId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post('/api/churches/:id/activities', authMiddleware, async (req: any, res) => {
    try {
      const churchId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const activityData = insertActivitySchema.parse({
        ...req.body,
        churchId,
        userId,
      });
      
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Analytics routes
  app.get('/api/analytics', authMiddleware, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
