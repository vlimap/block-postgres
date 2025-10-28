const express = require('express');
const { Project } = require('../models');
const requireAuth = require('../middleware/requireAuth');
const { projectPayloadSchema } = require('../utils/validation');

const router = express.Router();

// Todas as rotas abaixo exigem sessão válida.
router.use(requireAuth);

router.get('/', async (req, res) => {
  const projects = await Project.findAll({
    where: { userId: req.user.id },
    order: [['updatedAt', 'DESC']],
  });
  res.json(projects);
});

router.post('/', async (req, res) => {
  const parse = projectPayloadSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }
  const { name, modelJson } = parse.data;
  const project = await Project.create({
    name,
    modelJson,
    userId: req.user.id,
  });
  res.status(201).json(project);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOne({ where: { id, userId: req.user.id } });
  if (!project) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }
  const parse = projectPayloadSchema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message });
  }
  const { name, modelJson } = parse.data;
  if (name !== undefined) project.name = name;
  if (modelJson !== undefined) project.modelJson = modelJson;
  await project.save();
  res.json(project);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const deleted = await Project.destroy({ where: { id, userId: req.user.id } });
  if (!deleted) {
    return res.status(404).json({ error: 'Projeto não encontrado.' });
  }
  res.status(204).end();
});

module.exports = router;
