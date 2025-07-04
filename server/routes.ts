import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertChurchSchema, insertVisitSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Churches routes
  app.get('/api/churches', isAuthenticated, async (req: any, res) => {
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

  app.get('/api/churches/:id', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/churches', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/churches/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/churches/:id', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/churches/:id/visits', isAuthenticated, async (req: any, res) => {
    try {
      const churchId = parseInt(req.params.id);
      const visits = await storage.getVisitsByChurch(churchId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.post('/api/churches/:id/visits', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/churches/:id/activities', isAuthenticated, async (req: any, res) => {
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

  app.post('/api/churches/:id/activities', isAuthenticated, async (req: any, res) => {
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
  app.get('/api/analytics', isAuthenticated, async (req: any, res) => {
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
