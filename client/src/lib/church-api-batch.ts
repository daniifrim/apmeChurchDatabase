/**
 * Church API Batching Service
 * 
 * This service provides optimized batch API calls for church-related data
 * to reduce the number of individual HTTP requests and improve performance.
 */

import { apiRequest } from './queryClient';

interface ChurchBatchData {
  church: any;
  starRating?: any;
  visits?: any[];
  ratingHistory?: any;
}

interface BatchRequestOptions {
  includeStarRating?: boolean;
  includeVisits?: boolean;
  includeRatingHistory?: boolean;
  ratingHistoryLimit?: number;
}

/**
 * Batch fetch church data with optional related data
 * This reduces multiple API calls to a single request
 */
export async function fetchChurchBatchData(
  churchId: number,
  options: BatchRequestOptions = {}
): Promise<ChurchBatchData> {
  const {
    includeStarRating = false,
    includeVisits = false,
    includeRatingHistory = false,
    ratingHistoryLimit = 10
  } = options;

  // Build query parameters for what data to include
  const params = new URLSearchParams();
  if (includeStarRating) params.append('includeStarRating', 'true');
  if (includeVisits) params.append('includeVisits', 'true');
  if (includeRatingHistory) {
    params.append('includeRatingHistory', 'true');
    params.append('ratingHistoryLimit', ratingHistoryLimit.toString());
  }

  try {
    // Try to use the batch endpoint if available
    const response = await apiRequest('GET', `/api/churches/${churchId}/batch?${params}`);
    return response.json();
  } catch (error) {
    // Fallback to individual API calls if batch endpoint doesn't exist
    console.warn('Batch endpoint not available, falling back to individual requests');
    return await fetchChurchDataFallback(churchId, options);
  }
}

/**
 * Fallback method using individual API calls
 * This maintains compatibility while we transition to batch endpoints
 */
async function fetchChurchDataFallback(
  churchId: number,
  options: BatchRequestOptions
): Promise<ChurchBatchData> {
  const promises: Promise<any>[] = [];
  const data: ChurchBatchData = { church: null };

  // Always fetch the church data
  promises.push(
    apiRequest('GET', `/api/churches/${churchId}`)
      .then(res => res.json())
      .then(church => { data.church = church; })
  );

  // Conditionally fetch additional data
  if (options.includeStarRating) {
    promises.push(
      apiRequest('GET', `/api/churches/${churchId}/star-rating`)
        .then(res => res.json())
        .then(rating => { data.starRating = rating; })
        .catch(() => { data.starRating = null; })
    );
  }

  if (options.includeVisits) {
    promises.push(
      apiRequest('GET', `/api/churches/${churchId}/visits`)
        .then(res => res.json())
        .then(visits => { data.visits = visits; })
        .catch(() => { data.visits = []; })
    );
  }

  if (options.includeRatingHistory) {
    promises.push(
      fetch(`/api/churches/${churchId}/star-rating/history?limit=${options.ratingHistoryLimit || 10}`)
        .then(res => res.json())
        .then(history => { data.ratingHistory = history; })
        .catch(() => { data.ratingHistory = null; })
    );
  }

  // Wait for all requests to complete
  await Promise.allSettled(promises);
  
  return data;
}

/**
 * Batch fetch multiple churches with their basic rating data
 * Useful for list views where we need ratings for multiple churches
 */
export async function fetchMultipleChurchesWithRatings(
  churchIds: number[]
): Promise<Array<{ church: any; starRating: any }>> {
  // Try batch endpoint first
  try {
    const params = new URLSearchParams();
    churchIds.forEach(id => params.append('churchIds', id.toString()));
    params.append('includeStarRating', 'true');

    const response = await apiRequest('GET', `/api/churches/batch-multiple?${params}`);
    return response.json();
  } catch (error) {
    // Fallback to individual requests with Promise.allSettled for better performance
    console.warn('Multiple church batch endpoint not available, using individual requests');
    
    const promises = churchIds.map(async (churchId) => {
      try {
        const batchData = await fetchChurchDataFallback(churchId, { includeStarRating: true });
        return {
          church: batchData.church,
          starRating: batchData.starRating
        };
      } catch (error) {
        return {
          church: null,
          starRating: null
        };
      }
    });

    const results = await Promise.allSettled(promises);
    return results
      .filter((result): result is PromiseFulfilledResult<{ church: any; starRating: any }> => 
        result.status === 'fulfilled' && result.value.church !== null
      )
      .map(result => result.value);
  }
}

/**
 * Custom hook for batched church data fetching with React Query
 */
export function useChurchBatchData(
  churchId: number,
  options: BatchRequestOptions = {}
) {
  const queryKey = [
    'church-batch-data',
    churchId,
    options.includeStarRating,
    options.includeVisits,
    options.includeRatingHistory,
    options.ratingHistoryLimit
  ];

  return {
    queryKey,
    queryFn: () => fetchChurchBatchData(churchId, options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  };
}

/**
 * Debounced batch request manager
 * Collects multiple requests and batches them together
 */
class BatchRequestManager {
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    churchId: number;
    options: BatchRequestOptions;
  }> = new Map();
  
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly debounceMs = 100;

  async request(churchId: number, options: BatchRequestOptions = {}): Promise<ChurchBatchData> {
    const requestKey = `${churchId}-${JSON.stringify(options)}`;
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestKey, { resolve, reject, churchId, options });
      
      // Clear existing timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      // Set new timeout to batch requests
      this.timeoutId = setTimeout(() => {
        this.processBatch();
      }, this.debounceMs);
    });
  }

  private async processBatch() {
    const requests = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();
    this.timeoutId = null;

    // Group requests by similar options to optimize batching
    const groupedRequests = new Map<string, typeof requests>();
    
    requests.forEach(request => {
      const optionsKey = JSON.stringify(request.options);
      if (!groupedRequests.has(optionsKey)) {
        groupedRequests.set(optionsKey, []);
      }
      groupedRequests.get(optionsKey)!.push(request);
    });

    // Process each group
    for (const [optionsKey, group] of Array.from(groupedRequests.entries())) {
      try {
        // If multiple churches need the same data, try to batch them
        if (group.length > 1) {
          const churchIds = group.map((r: any) => r.churchId);
          // This would require a server-side batch endpoint
          // For now, we'll process them individually but in parallel
          const promises = group.map(async ({ churchId, options, resolve, reject }: any) => {
            try {
              const data = await fetchChurchBatchData(churchId, options);
              resolve(data);
            } catch (error) {
              reject(error);
            }
          });
          
          await Promise.allSettled(promises);
        } else {
          // Single request
          const { churchId, options, resolve, reject } = group[0];
          try {
            const data = await fetchChurchBatchData(churchId, options);
            resolve(data);
          } catch (error) {
            reject(error);
          }
        }
      } catch (error) {
        // Reject all requests in this group
        group.forEach(({ reject }: any) => reject(error));
      }
    }
  }
}

export const batchRequestManager = new BatchRequestManager();