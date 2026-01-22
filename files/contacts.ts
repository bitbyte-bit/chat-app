import express, { Response } from 'express';
import { runQuery, runInsert, runUpdate } from '../database';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = express.Router();

// Add contact
router.post('/add', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contact_name, phone_number, email } = req.body;
    const user_id = req.user. id;

    const result = await runInsert(
      'INSERT INTO contacts (user_id, contact_name, phone_number, email) VALUES (?, ?, ?, ?)',
      [user_id, contact_name, phone_number || null, email || null]
    );

    res.json({ id: result.id, message: 'Contact added' });
  } catch (error: any) {
    res.status(500).json({ error: error. message });
  }
});

// Get contacts
router.get('/list', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user.id;
    const contacts: any[] = await runQuery(
      'SELECT * FROM contacts WHERE user_id = ?  ORDER BY contact_name ASC',
      [user_id]
    );

    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contact
router.delete('/:contactId', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contactId } = req.params;
    const user_id = req.user.id;

    await runUpdate(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?',
      [contactId, user_id]
    );

    res.json({ message: 'Contact deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;