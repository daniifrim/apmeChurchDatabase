import { supabase } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod, validateRequestBody } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import { z } from 'zod';

// Request validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type RegisterRequest = z.infer<typeof registerSchema>;

interface RegisterResponse {
  success: boolean;
  user?: any;
  session?: any;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse>
) {
  // Handle CORS
  if (handleCors(req, res)) return;

  // Validate HTTP method
  if (!validateMethod(req, res, ['POST'])) return;

  logServerlessFunction('register', req.method!, undefined, { email: req.body?.email });

  try {
    // Validate request body
    const { email, password, firstName, lastName } = validateRequestBody(req.body, registerSchema);

    // Create user with Supabase auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });

    if (error) {
      logServerlessFunction('register', 'POST', undefined, { error: error.message });
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }

    if (data.user) {
      logServerlessFunction('register', 'POST', data.user.id, { success: true });

      // Create user in our database
      await serverlessStorage.upsertUser({
        id: data.user.id,
        email: data.user.email!,
        firstName: firstName || '',
        lastName: lastName || '',
        role: 'missionary', // Default role
        region: 'Romania'
      });

      return res.status(201).json({
        success: true,
        user: data.user,
        session: data.session
      });
    }

    // Should not reach here, but handle edge case
    return res.status(500).json({
      success: false,
      message: 'Registration failed - no user created'
    });

  } catch (error) {
    logServerlessFunction('register', 'POST', undefined, { error: error instanceof Error ? error.message : 'Unknown error' });
    return handleServerlessError(error, res);
  }
}