import express, { Response } from 'express';
import bcrypt from 'bcrypt';
import { runQuery, runInsert, runUpdate } from '../database';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = express.Router();

// Create group
router.post('/create', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, password } = req.body;
    const creator_id = req.user.id;

    const hashedPassword = password ?  await bcrypt.hash(password, 10) : null;

    const result = await runInsert(
      'INSERT INTO groups (name, description, creator_id, password) VALUES (?, ?, ?, ?)',
      [name, description || null, creator_id, hashedPassword]
    );

    await runInsert(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [result.id, creator_id]
    );

    res.json({ id: result.id, message: 'Group created' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join group
router.post('/:groupId/join', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { password } = req.body;
    const user_id = req.user.id;

    const groups: any[] = await runQuery('SELECT * FROM groups WHERE id = ? ', [groupId]);
    if (!groups.length) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const group = groups[0];

    if (group.password) {
      const isValid = await bcrypt.compare(password, group.password);
      if (!isValid) {
        return res. status(400).json({ error: 'Invalid group password' });
      }
    }

    await runInsert(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [groupId, user_id]
    );

    res.json({ message: 'Joined group' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit group (creator only)
router.put('/:groupId', verifyToken, async (req: AuthRequest, res:  Response) => {
  try {
    const { groupId } = req.params;
    const { name, description, password } = req.body;
    const user_id = req.user.id;

    const groups: any[] = await runQuery(
      'SELECT * FROM groups WHERE id = ? AND creator_id = ?',
      [groupId, user_id]
    );

    if (!groups.length) {
      return res.status(403).json({ error: 'Only creator can edit' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    await runUpdate(
      'UPDATE groups SET name = ?, description = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, hashedPassword, groupId]
    );

    res.json({ message: 'Group updated' });
  } catch (error: any) {
    res.status(500).json({ error: error. message });
  }
});

// Get group details
router.get('/: groupId', verifyToken, async (req: AuthRequest, res:  Response) => {
  try {
    const { groupId } = req.params;
    const groups: any[] = await runQuery('SELECT id, name, description, creator_id, profile_picture, created_at FROM groups WHERE id = ? ', [groupId]);

    if (!groups.length) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const members: any[] = await runQuery(
      'SELECT u.id, u.username, u.profile_picture FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?',
      [groupId]
    );

    res.json({ ... groups[0], members });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get group messages
router.get('/:groupId/messages', verifyToken, async (req: AuthRequest, res:  Response) => {
  try {
    const { groupId } = req.params;
    const messages: any[] = await runQuery(
      `SELECT gm.*, u.username, u.profile_picture FROM group_messages gm
       JOIN users u ON gm.sender_id = u.id
       WHERE gm.group_id = ? 
       ORDER BY gm.created_at ASC`,
      [groupId]
    );

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send group message
router.post('/:groupId/message', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req. params;
    const { body, media_url, media_type } = req.body;
    const sender_id = req.user.id;

    const result = await runInsert(
      'INSERT INTO group_messages (group_id, sender_id, body, media_url, media_type) VALUES (?, ?, ?, ?, ?)',
      [groupId, sender_id, body || null, media_url || null, media_type || null]
    );

    res.json({ id: result.id, message: 'Group message sent' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's groups
router.get('/user/list', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const groups: any[] = await runQuery(
      `SELECT g.* FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ? 
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;