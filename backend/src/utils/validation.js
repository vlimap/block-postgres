const { z } = require('zod');

const projectPayloadSchema = z.object({
  name: z.string().trim().min(1, 'O nome é obrigatório').max(120),
  modelJson: z.any(),
});

module.exports = {
  projectPayloadSchema,
  marketingConsentSchema: z.object({
    marketingOptIn: z.boolean(),
  }),
};
