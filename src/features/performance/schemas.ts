import { z } from 'zod'

export const goalFormSchema = z
  .object({
    employee_id: z.string().min(1, 'Select an employee'),
    title: z.string().trim().min(3, 'Goal title is required').max(140),
    description: z.string().trim().max(400, 'Keep the description short').optional().or(z.literal('')),
    category: z.enum(['performance', 'development', 'project', 'leadership'], {
      message: 'Select a category',
    }),
    start_date: z.string().min(1, 'Start date is required'),
    target_date: z.string().min(1, 'Target date is required'),
    progress_percent: z.coerce
      .number({ message: 'Enter progress' })
      .int('Progress must be a whole number')
      .min(0, 'Progress cannot be below 0')
      .max(100, 'Progress cannot exceed 100'),
    status: z.enum(['not_started', 'in_progress', 'completed', 'cancelled']),
  })
  .superRefine((values, ctx) => {
    if (values.start_date && values.target_date && values.target_date < values.start_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['target_date'],
        message: 'Target date cannot be before the start date',
      })
    }
    if (values.status === 'completed' && values.progress_percent !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['progress_percent'],
        message: 'Completed goals should be at 100%',
      })
    }
  })

export type GoalFormInput = z.input<typeof goalFormSchema>
export type GoalFormValues = z.output<typeof goalFormSchema>

const rating = z.coerce
  .number({ message: 'Select a rating' })
  .int()
  .min(1, 'Select a rating')
  .max(5, 'Ratings are 1–5')

export const reviewFormSchema = z.object({
  goal_achievement_rating: rating,
  quality_rating: rating,
  collaboration_rating: rating,
  initiative_rating: rating,
  strengths: z.string().trim().max(400, 'Keep it concise').optional().or(z.literal('')),
  development_areas: z.string().trim().max(400, 'Keep it concise').optional().or(z.literal('')),
  overall_comments: z.string().trim().max(400, 'Keep it concise').optional().or(z.literal('')),
})

export type ReviewFormInput = z.input<typeof reviewFormSchema>
export type ReviewFormValues = z.output<typeof reviewFormSchema>

export const cycleFormSchema = z
  .object({
    name: z.string().trim().min(3, 'Cycle name is required').max(80),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    status: z.enum(['draft', 'active', 'closed']),
  })
  .superRefine((values, ctx) => {
    if (values.start_date && values.end_date && values.end_date < values.start_date) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'End date cannot be before the start date',
      })
    }
  })

export type CycleFormValues = z.output<typeof cycleFormSchema>
