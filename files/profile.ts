import express, { Response } from 'express';
import { runQuery, runUpdate } from '../database';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = express. Router();

// Get user profile
router.get('/:userId', async (req: AuthRequest, res:  Response) => {
  try {
    const { userId } = req.params;
    const users: any[] = await runQuery(
      'SELECT id, username, email, profile_picture, bio, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/: userId', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.id !== parseInt(req.params.userId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { username, bio, profile_picture } = req.body;
    const userId = req.params.userId;

    await runUpdate(
      'UPDATE users SET username = COALESCE(?, username), bio = COALESCE(?, bio), profile_picture = COALESCE(?, profile_picture), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username || null, bio || null, profile_picture || null, userId]
    );

    const users: any[] = await runQuery('SELECT * FROM users WHERE id = ?', [userId]);
    res.json(users[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Search users
router.get('/search/: query', async (req: AuthRequest, res: Response) => {
  try {
    const { query } = req.params;
    const users: any[] = await runQuery(
      'SELECT id, username, email, profile_picture, bio FROM users WHERE username LIKE ? OR email LIKE ?  LIMIT 10',
      [`%${query}%`, `%${query}%`]
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;