interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  confidence: number;
}

interface GeocodingError {
  error: string;
  message: string;
}

export class GeocodingService {
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  private static readonly CACHE = new Map<string, GeocodingResult>();
  
  /**
   * Geocode an address to coordinates using OpenStreetMap Nominatim
   */
  static async geocodeAddress(address: string, city?: string, county?: string): Promise<GeocodingResult | GeocodingError> {
    if (!address.trim()) {
      return { error: 'INVALID_ADDRESS', message: 'Address cannot be empty' };
    }

    // Create cache key
    const cacheKey = `${address}, ${city || ''}, ${county || ''}`.toLowerCase().trim();
    
    // Check cache first
    if (this.CACHE.has(cacheKey)) {
      return this.CACHE.get(cacheKey)!;
    }

    try {
      // Build query string - prioritize city and county for better accuracy
      let query = address;
      if (city && city !== address) query += `, ${city}`;
      if (county && county !== city) query += `, ${county}`;
      query += ', Romania';

      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '1',
        addressdetails: '1',
        countrycodes: 'ro',
        'accept-language': 'ro,en',
        email: 'contact@apme-churches.com' // Required for Nominatim
      });

      const response = await fetch(`${this.NOMINATIM_URL}?${params}`, {
        headers: {
          'User-Agent': 'APME-Churches-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return { error: 'NOT_FOUND', message: 'Address not found' };
      }

      const result = data[0];
      const geocodingResult: GeocodingResult = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name,
        confidence: this.calculateConfidence(result)
      };

      // Cache the result
      this.CACHE.set(cacheKey, geocodingResult);
      
      return geocodingResult;
    } catch (error) {
      console.warn('Geocoding service unavailable, using stored coordinates');
      return { 
        error: 'SERVICE_UNAVAILABLE', 
        message: 'Using stored coordinates' 
      };
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  static async geocodeChurches(churches: Array<{
    id: number;
    address: string;
    city: string;
    county: string;
  }>): Promise<Map<number, GeocodingResult | GeocodingError>> {
    const results = new Map<number, GeocodingResult | GeocodingError>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < churches.length; i += batchSize) {
      const batch = churches.slice(i, i + batchSize);
      const promises = batch.map(async (church) => {
        const result = await this.geocodeAddress(church.address, church.city, church.county);
        return { id: church.id, result };
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < churches.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Calculate confidence score based on Nominatim result
   */
  private static calculateConfidence(result: any): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for exact matches
    if (result.importance) {
      confidence = Math.min(0.9, result.importance);
    }
    
    // Check address components
    const address = result.address || {};
    if (address.road) confidence += 0.1;
    if (address.house_number) confidence += 0.1;
    if (address.city || address.town) confidence += 0.1;
    if (address.county) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Clear the geocoding cache
   */
  static clearCache(): void {
    this.CACHE.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.CACHE.size,
      keys: Array.from(this.CACHE.keys())
    };
  }
}