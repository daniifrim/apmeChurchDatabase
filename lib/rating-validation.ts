import { CreateRatingRequest } from "@shared/schema";

export interface ValidationError {
  field: string;
  message: string;
  messageRo?: string; // Romanian translation
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Service for validating rating form data
 */
export class RatingValidationService {
  /**
   * Validate rating data with Romanian error messages
   */
  validateRatingData(data: CreateRatingRequest & { attendeesCount: number }): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate mission openness rating
    if (!data.missionOpennessRating || data.missionOpennessRating < 1 || data.missionOpennessRating > 5) {
      errors.push({
        field: 'missionOpennessRating',
        message: 'Mission openness rating must be between 1-5',
        messageRo: 'Evaluarea deschiderii pentru misiune trebuie să fie între 1-5'
      });
    }

    // Validate hospitality rating
    if (!data.hospitalityRating || data.hospitalityRating < 1 || data.hospitalityRating > 5) {
      errors.push({
        field: 'hospitalityRating',
        message: 'Hospitality rating must be between 1-5',
        messageRo: 'Evaluarea ospitalității trebuie să fie între 1-5'
      });
    }

    // Validate missionary support count
    if (data.missionarySupportCount < 0) {
      errors.push({
        field: 'missionarySupportCount',
        message: 'Missionary support count cannot be negative',
        messageRo: 'Numărul de misionari susținuți nu poate fi negativ'
      });
    }

    // Validate offerings amount
    if (data.offeringsAmount < 0) {
      errors.push({
        field: 'offeringsAmount',
        message: 'Offerings amount cannot be negative',
        messageRo: 'Suma ofrandelor nu poate fi negativă'
      });
    }

    // Validate church members count
    if (!data.churchMembers || data.churchMembers < 1) {
      errors.push({
        field: 'churchMembers',
        message: 'Church must have at least 1 member',
        messageRo: 'Biserica trebuie să aibă cel puțin 1 membru'
      });
    }

    // Validate attendees count
    if (!data.attendeesCount || data.attendeesCount < 1) {
      errors.push({
        field: 'attendeesCount',
        message: 'Must have at least 1 attendee',
        messageRo: 'Trebuie să fie cel puțin 1 participant'
      });
    }

    // Validate visit duration if provided
    if (data.visitDurationMinutes !== undefined && data.visitDurationMinutes <= 0) {
      errors.push({
        field: 'visitDurationMinutes',
        message: 'Visit duration must be positive',
        messageRo: 'Durata vizitei trebuie să fie pozitivă'
      });
    }

    // Business logic validations
    if (data.attendeesCount > data.churchMembers * 3) {
      errors.push({
        field: 'attendeesCount',
        message: 'Attendees count seems unusually high compared to church members',
        messageRo: 'Numărul de participanți pare neobișnuit de mare comparativ cu membrii bisericii'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that a visit can be rated
   */
  validateVisitForRating(visitId: number, isAlreadyRated: boolean, missionaryId: string, visitMissionaryId: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (isAlreadyRated) {
      errors.push({
        field: 'visitId',
        message: 'This visit has already been rated',
        messageRo: 'Această vizită a fost deja evaluată'
      });
    }

    if (missionaryId !== visitMissionaryId) {
      errors.push({
        field: 'missionaryId',
        message: 'You can only rate visits you personally conducted',
        messageRo: 'Poți evalua doar vizitele pe care le-ai efectuat personal'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get user-friendly error message in preferred language
   */
  getErrorMessage(error: ValidationError, preferRomanian: boolean = false): string {
    return preferRomanian && error.messageRo ? error.messageRo : error.message;
  }
}