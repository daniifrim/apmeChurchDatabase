import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRatingRequestSchema, type CreateRatingRequest } from '@shared/schema';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Star, Heart, Users, DollarSign, Clock } from 'lucide-react';

interface VisitRatingFormProps {
  visitId: number;
  churchName: string;
  onSuccess?: (rating: any) => void;
  onCancel?: () => void;
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  descriptions?: { [key: number]: string };
}

function StarRating({ value, onChange, label, description, descriptions }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && (
        <p className="text-xs text-gray-600">{description}</p>
      )}
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`p-1 rounded transition-colors ${
              star <= (hoverValue || value)
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => onChange(star)}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {value > 0 ? `${value}/5` : 'Nu a fost evaluat'}
        </span>
      </div>
      {descriptions && value > 0 && descriptions[value] && (
        <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          {descriptions[value]}
        </p>
      )}
    </div>
  );
}

export function VisitRatingForm({ visitId, churchName, onSuccess, onCancel }: VisitRatingFormProps) {
  const queryClient = useQueryClient();
  const [calculatedRating, setCalculatedRating] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateRatingRequest>({
    resolver: zodResolver(createRatingRequestSchema),
    defaultValues: {
      missionOpennessRating: 0,
      hospitalityRating: 0,
      missionarySupportCount: 0,
      offeringsAmount: 0,
      churchMembers: 1,
      attendeesCount: 1,
    }
  });

  const missionOpennessRating = watch('missionOpennessRating');
  const hospitalityRating = watch('hospitalityRating');

  const createRatingMutation = useMutation({
    mutationFn: async (data: CreateRatingRequest) => {
      const response = await fetch(`/api/visits/${visitId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.messageRo || error.message || 'Failed to create rating');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] });
      queryClient.invalidateQueries({ queryKey: ['church-ratings'] });
      onSuccess?.(data);
    },
  });

  const onSubmit = (data: CreateRatingRequest) => {
    createRatingMutation.mutate(data);
  };

  const missionOpennessDescriptions = {
    1: "Resistent la lucrarea de misiune, nu este interesat de outreach",
    2: "Interes minim, doar cooperare de bază",
    3: "Interes moderat, conștientizare de misiune",
    4: "Interes activ în lucrarea de misiune, cooperare bună",
    5: "Foarte orientat spre misiune, proactiv în evanghelizare"
  };

  const hospitalityDescriptions = {
    1: "Neospitalier, necooperant, mediu ostil",
    2: "Ospitalitate minimală, doar curtoazie de bază",
    3: "Ospitalitate standard, îndeplinește așteptările de bază",
    4: "Atmosferă primitoare, cooperare bună",
    5: "Ospitalitate excepțională, depășește așteptările"
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Evaluare Vizită
        </CardTitle>
        <CardDescription>
          Evaluează vizita la <strong>{churchName}</strong> folosind criteriile specifice românești
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Mission Openness Rating */}
          <div className="space-y-4">
            <StarRating
              value={missionOpennessRating}
              onChange={(value) => setValue('missionOpennessRating', value)}
              label="Deschidere generală pentru misiune"
              descriptions={missionOpennessDescriptions}
            />
            {errors.missionOpennessRating && (
              <p className="text-sm text-red-600">{errors.missionOpennessRating.message}</p>
            )}
          </div>

          {/* Hospitality Rating */}
          <div className="space-y-4">
            <StarRating
              value={hospitalityRating}
              onChange={(value) => setValue('hospitalityRating', value)}
              label="Ospitalitate"
              descriptions={hospitalityDescriptions}
            />
            {errors.hospitalityRating && (
              <p className="text-sm text-red-600">{errors.hospitalityRating.message}</p>
            )}
          </div>

          {/* Missionary Support */}
          <div className="space-y-2">
            <Label htmlFor="missionarySupportCount" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Numărul de misionari susținuți de biserică
            </Label>
            <Input
              id="missionarySupportCount"
              type="number"
              min="0"
              {...register('missionarySupportCount', { valueAsNumber: true })}
              className="w-full"
            />
            {errors.missionarySupportCount && (
              <p className="text-sm text-red-600">{errors.missionarySupportCount.message}</p>
            )}
          </div>

          {/* Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offeringsAmount" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Suma ofrandelor (RON)
              </Label>
              <Input
                id="offeringsAmount"
                type="number"
                min="0"
                step="0.01"
                {...register('offeringsAmount', { valueAsNumber: true })}
              />
              {errors.offeringsAmount && (
                <p className="text-sm text-red-600">{errors.offeringsAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="churchMembers">
                Numărul de membri ai bisericii
              </Label>
              <Input
                id="churchMembers"
                type="number"
                min="1"
                {...register('churchMembers', { valueAsNumber: true })}
              />
              {errors.churchMembers && (
                <p className="text-sm text-red-600">{errors.churchMembers.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendeesCount">
                Numărul de participanți la vizită
              </Label>
              <Input
                id="attendeesCount"
                type="number"
                min="1"
                {...register('attendeesCount', { valueAsNumber: true })}
              />
              {errors.attendeesCount && (
                <p className="text-sm text-red-600">{errors.attendeesCount.message}</p>
              )}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitDurationMinutes" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Durata vizitei (minute) - opțional
              </Label>
              <Input
                id="visitDurationMinutes"
                type="number"
                min="1"
                {...register('visitDurationMinutes', { valueAsNumber: true })}
              />
              {errors.visitDurationMinutes && (
                <p className="text-sm text-red-600">{errors.visitDurationMinutes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                Note suplimentare - opțional
              </Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Adaugă orice observații suplimentare despre vizită..."
                rows={3}
              />
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* Error Display */}
          {createRatingMutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {createRatingMutation.error.message}
              </p>
            </div>
          )}

          {/* Success Display */}
          {createRatingMutation.isSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">
                Evaluarea a fost salvată cu succes! 
                {createRatingMutation.data?.data?.calculatedStarRating && (
                  <span className="font-medium">
                    {' '}Rating calculat: {createRatingMutation.data.data.calculatedStarRating}/5 stele
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Anulează
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || missionOpennessRating === 0 || hospitalityRating === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Se salvează...' : 'Salvează Evaluarea'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}