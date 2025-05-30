import { Router } from 'express';
import pool from '../config/database';

const router = Router();

// Get all companies
router.get('/', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;
    
    let query = `
      SELECT 
        id,
        securities_code,
        company_name,
        industry,
        created_at,
        updated_at
      FROM companies
    `;
    
    const values: any[] = [];
    let valueIndex = 1;
    
    if (search) {
      query += ` WHERE company_name ILIKE $${valueIndex} OR securities_code ILIKE $${valueIndex}`;
      values.push(`%${search}%`);
      valueIndex++;
    }
    
    query += ` ORDER BY company_name LIMIT $${valueIndex} OFFSET $${valueIndex + 1}`;
    values.push(limit, offset);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, values);
      
      res.json({
        companies: result.rows,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Get company by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM companies WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      res.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Search companies
router.post('/search', async (req, res, next) => {
  try {
    const { query: searchQuery, filters = {} } = req.body;
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          id,
          securities_code,
          company_name,
          industry,
          created_at
        FROM companies
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let valueIndex = 1;
      
      if (searchQuery) {
        query += ` AND (company_name ILIKE $${valueIndex} OR securities_code ILIKE $${valueIndex})`;
        values.push(`%${searchQuery}%`);
        valueIndex++;
      }
      
      if (filters.industry) {
        query += ` AND industry = $${valueIndex}`;
        values.push(filters.industry);
        valueIndex++;
      }
      
      query += ' ORDER BY company_name LIMIT 100';
      
      const result = await client.query(query, values);
      
      res.json({
        results: result.rows,
        count: result.rows.length
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

export default router;