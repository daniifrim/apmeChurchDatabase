import { withAuth } from '../../../lib/auth';
import { serverlessStorage } from '../../../lib/storage';
import { handleServerlessError, validateRequestBody } from '../../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../../lib/utils';
import { insertVisitSchema } from '@shared/schema';
import type { NextApiRequest, NextApiResponse } from '../../../lib/types';
import type { JWTPayload } from '../../../lib/auth';
import type { Visit, InsertVisit } from '@shared/schema';

interface VisitResponse {
  success?: boolean;
  data?: Visit;
  message?: string;
  messageRo?: string;
  errors?: any;
}

async function handler(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitResponse | Visit>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  const userId = req.user.sub;
  const visitId = parseInt(req.query.id as string);

  if (isNaN(visitId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid visit ID'
    });
  }

  switch (req.method) {
    case 'GET':
      return handleGetVisit(req, res, userId, visitId);
    case 'PUT':
      return handleUpdateVisit(req, res, userId, visitId);
    case 'DELETE':
      return handleDeleteVisit(req, res, userId, visitId);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Method ${req.method} not allowed. Allowed methods: GET, PUT, DELETE` 
      });
  }
}

async function handleGetVisit(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitResponse | Visit>,
  userId: string,
  visitId: number
) {
  logServerlessFunction('visit-get', 'GET', userId, { visitId });

  try {
    const visit = await serverlessStorage.getVisitById(visitId);

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
        messageRo: 'Vizita nu a fost găsită'
      });
    }

    logServerlessFunction('visit-get', 'GET', userId, { 
      visitId,
      churchId: visit.churchId
    });

    // Return visit object directly for compatibility
    return res.status(200).json(visit);

  } catch (error) {
    logServerlessFunction('visit-get', 'GET', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

async function handleUpdateVisit(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitResponse | Visit>,
  userId: string,
  visitId: number
) {
  logServerlessFunction('visit-update', 'PUT', userId, { visitId });
  console.log('=== DEBUG: handleUpdateVisit ===');
  console.log('visitId:', visitId);
  console.log('userId:', userId);
  console.log('req.body:', req.body);

  try {
    // Check if visit exists
    const existingVisit = await serverlessStorage.getVisitById(visitId);
    if (!existingVisit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
        messageRo: 'Vizita nu a fost găsită'
      });
    }

    // Check if user can edit this visit (only the creator or admin)
    if (existingVisit.visitedBy !== userId && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'You can only edit visits you created',
        messageRo: 'Poți edita doar vizitele pe care le-ai creat'
      });
    }

    // Validate and parse visit data (partial update)
    const visitData = validateRequestBody(req.body, insertVisitSchema.partial());

    const updatedVisit = await serverlessStorage.updateVisit(visitId, visitData);

    // Create activity for visit update
    await serverlessStorage.createActivity({
      churchId: updatedVisit.churchId,
      userId,
      type: 'visit',
      title: 'Visit updated',
      description: `Visit details were updated`,
      activityDate: new Date(),
    });

    logServerlessFunction('visit-update', 'PUT', userId, { 
      visitId,
      churchId: updatedVisit.churchId
    });

    // Return updated visit object directly
    return res.status(200).json(updatedVisit);

  } catch (error) {
    console.error('=== ERROR in handleUpdateVisit ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    logServerlessFunction('visit-update', 'PUT', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // In development, return detailed error
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
    return handleServerlessError(error, res);
  }
}

async function handleDeleteVisit(
  req: NextApiRequest & { user: JWTPayload },
  res: NextApiResponse<VisitResponse>,
  userId: string,
  visitId: number
) {
  logServerlessFunction('visit-delete', 'DELETE', userId, { visitId });

  try {
    // Check if visit exists
    const existingVisit = await serverlessStorage.getVisitById(visitId);
    if (!existingVisit) {
      return res.status(404).json({
        success: false,
        message: 'Visit not found',
        messageRo: 'Vizita nu a fost găsită'
      });
    }

    // Check if user can delete this visit (only the creator or admin)
    if (existingVisit.visitedBy !== userId && req.user.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete visits you created',
        messageRo: 'Poți șterge doar vizitele pe care le-ai creat'
      });
    }

    // Check if visit has been rated (prevent deletion of rated visits)
    if (existingVisit.isRated) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a visit that has been rated',
        messageRo: 'Nu se poate șterge o vizită care a fost evaluată'
      });
    }

    await serverlessStorage.deleteVisit(visitId);

    // Create activity for visit deletion
    try {
      await serverlessStorage.createActivity({
        churchId: existingVisit.churchId,
        userId,
        type: 'note',
        title: 'Visit deleted',
        description: `Visit from ${existingVisit.visitDate ? new Date(existingVisit.visitDate).toLocaleDateString('ro-RO') : 'unknown date'} was deleted`,
        activityDate: new Date(),
      });
    } catch (activityError) {
      // Log activity creation error but don't fail the delete operation
      logServerlessFunction('visit-delete-activity-error', 'DELETE', userId, { 
        visitId,
        activityError: activityError instanceof Error ? activityError.message : 'Unknown activity error'
      });
    }

    logServerlessFunction('visit-delete', 'DELETE', userId, { 
      visitId,
      churchId: existingVisit.churchId
    });

    return res.status(200).json({
      success: true,
      message: 'Visit deleted successfully',
      messageRo: 'Vizita a fost ștearsă cu succes'
    });

  } catch (error) {
    logServerlessFunction('visit-delete', 'DELETE', userId, { 
      visitId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return handleServerlessError(error, res);
  }
}

export default withAuth(handler);