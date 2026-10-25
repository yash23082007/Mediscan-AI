const { z } = require('zod');

// ============================================
// VALIDATION SCHEMAS
// ============================================

const registerPatientSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  age: z.number().int().min(1).max(150),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  weight: z.number().positive().max(500).optional(),
  height: z.number().positive().max(300).optional(),
  allergies: z.string().max(2000).optional().default(''),
  chronic_conditions: z.string().max(2000).optional().default('')
});

const registerDoctorSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  specialization: z.string().min(2).max(255),
  license_number: z.string().min(2).max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const questionnaireResponseSchema = z.object({
  responses: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  decision_path: z.array(z.string()).optional(),
  session_duration: z.number().int().positive().optional(),
  total_questions: z.number().int().positive().optional(),
  completed: z.boolean().optional()
});

const feedbackSchema = z.object({
  diagnosis_id: z.string().uuid(),
  action: z.enum(['approve', 'override', 'correct']),
  correction: z.object({
    conditions: z.array(z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1).optional()
    })).optional(),
    notes: z.string().optional()
  }).optional(),
  notes: z.string().max(2000).optional()
});

const updatePatientSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  age: z.number().int().min(1).max(150).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  weight: z.number().positive().max(500).optional(),
  height: z.number().positive().max(300).optional(),
  allergies: z.string().max(2000).optional(),
  chronic_conditions: z.string().max(2000).optional()
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Express middleware that validates request body against a Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated & sanitized data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validate,
  registerPatientSchema,
  registerDoctorSchema,
  loginSchema,
  questionnaireResponseSchema,
  feedbackSchema,
  updatePatientSchema
};
