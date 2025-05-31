import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Get available templates
router.get('/', async (req, res, next) => {
  try {
    const templatesPath = path.join(__dirname, '..', 'templates');
    const files = await fs.readdir(templatesPath);
    
    const templates = files
      .filter(file => file.endsWith('.hbs'))
      .map(file => ({
        name: file.replace('.hbs', ''),
        filename: file
      }));
    
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

// Get template content
router.get('/:templateName', async (req, res, next) => {
  try {
    const { templateName } = req.params;
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
    
    const content = await fs.readFile(templatePath, 'utf-8');
    
    res.json({
      name: templateName,
      content
    });
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      res.status(404).json({ error: 'Template not found' });
    } else {
      next(error);
    }
  }
});

// Create or update a template
router.put('/:templateName', async (req, res, next) => {
  try {
    const { templateName } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Template content is required' });
    }
    
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
    await fs.writeFile(templatePath, content, 'utf-8');
    
    res.json({
      message: 'Template saved successfully',
      name: templateName
    });
  } catch (error) {
    next(error);
  }
});

// Delete a template
router.delete('/:templateName', async (req, res, next) => {
  try {
    const { templateName } = req.params;
    
    // Prevent deletion of default templates
    const protectedTemplates = ['financial-report', 'comparison-report', 'summary-report'];
    if (protectedTemplates.includes(templateName)) {
      return res.status(403).json({ error: 'Cannot delete protected template' });
    }
    
    const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
    await fs.unlink(templatePath);
    
    res.json({
      message: 'Template deleted successfully',
      name: templateName
    });
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      res.status(404).json({ error: 'Template not found' });
    } else {
      next(error);
    }
  }
});

export default router;