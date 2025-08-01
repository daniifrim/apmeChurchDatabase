import { withAuth } from '../../lib/auth';
import { serverlessStorage } from '../../lib/storage';
import { handleServerlessError, validateMethod } from '../../lib/errorHandler';
import { handleCors, logServerlessFunction, parseQueryParam } from '../../lib/utils';
import type { NextApiRequest, NextApiResponse } from '../../lib/types';
import type { JWTPayload } from '../../lib/auth';

interface RegionalAnalyticsData {
    regionId?: number;
    regionName: string;
    totalChurches: number;
    engagementBreakdown: { level: string; count: number }[];
    countyBreakdown: { county: string; count: number }[];
    recentActivity: number;
}

interface RegionalAnalyticsResponse {
    success?: boolean;
    data?: RegionalAnalyticsData;
    message?: string;
}

async function handler(
    req: NextApiRequest & { user: JWTPayload },
    res: NextApiResponse<RegionalAnalyticsResponse | RegionalAnalyticsData>
) {
    // Handle CORS
    if (handleCors(req, res)) return;

    // Validate HTTP method
    if (!validateMethod(req, res, ['GET'])) return;

    const userId = req.user.sub;
    const regionId = parseQueryParam(req.query.regionId);

    if (!regionId) {
        return res.status(400).json({
            success: false,
            message: 'Region ID is required'
        });
    }

    logServerlessFunction('regional-analytics', 'GET', userId, { regionId });

    try {
        // Get regional analytics data
        const churches = await serverlessStorage.getChurches({
            regionId: parseInt(regionId)
        });

        // Get region name
        const regions = await serverlessStorage.getRccpRegions();
        const region = regions.find(r => r.id === parseInt(regionId));

        if (!region) {
            return res.status(404).json({
                success: false,
                message: 'Region not found'
            });
        }

        // Calculate engagement breakdown
        const engagementBreakdown = churches.reduce((acc: { level: string; count: number }[], church) => {
            const level = church.engagementLevel || 'unknown';
            const existing = acc.find(item => item.level === level);
            if (existing) {
                existing.count++;
            } else {
                acc.push({ level, count: 1 });
            }
            return acc;
        }, []);

        // Calculate county breakdown
        const countyBreakdown = churches.reduce((acc: { county: string; count: number }[], church) => {
            const county = church.counties?.name || 'Unknown';
            const existing = acc.find(item => item.county === county);
            if (existing) {
                existing.count++;
            } else {
                acc.push({ county, count: 1 });
            }
            return acc;
        }, []);

        // Calculate recent activity (churches updated in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentActivity = churches.filter(church =>
            new Date(church.updatedAt) > thirtyDaysAgo
        ).length;

        const analyticsData: RegionalAnalyticsData = {
            regionId: region.id,
            regionName: region.name,
            totalChurches: churches.length,
            engagementBreakdown,
            countyBreakdown,
            recentActivity
        };

        logServerlessFunction('regional-analytics', 'GET', userId, {
            regionId,
            regionName: region.name,
            totalChurches: churches.length
        });

        return res.status(200).json(analyticsData);

    } catch (error) {
        logServerlessFunction('regional-analytics', 'GET', userId, {
            regionId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return handleServerlessError(error, res);
    }
}

export default withAuth(handler);