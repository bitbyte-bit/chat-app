import express, { Response } from 'express';
import { runQuery, runInsert } from '../database';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = express.Router();

// Send message
router.post('/send', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { receiver_id, body, media_url, media_type } = req.body;
    const sender_id = req.user.id;

    const result = await runInsert(
      'INSERT INTO messages (sender_id, receiver_id, body, media_url, media_type) VALUES (?, ?, ?, ?, ?)',
      [sender_id, receiver_id, body || null, media_url || null, media_type || null]
    );

    res.json({ id: result.id, message: 'Message sent' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation
router.get('/conversation/:user_id', verifyToken, async (req: AuthRequest, res:  Response) => {
  try {
    const { user_id } = req.params;
    const current_user_id = req.user.id;

    const messages: any[] = await runQuery(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [current_user_id, user_id, user_id, current_user_id]
    );

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations
router.get('/all', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const conversations: any[] = await runQuery(
      `SELECT DISTINCT 
        CASE 
          WHEN sender_id = ?  THEN receiver_id 
          ELSE sender_id 
        END as user_id,
        MAX(created_at) as last_message_time
       FROM messages 
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY user_id
       ORDER BY last_message_time DESC`,
      [userId, userId, userId]
    );

    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ error: error. message });
  }
});

export default router;