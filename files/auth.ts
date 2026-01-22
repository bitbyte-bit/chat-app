import express, { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { runQuery, runInsert } from '../database';
import { AuthRequest, verifyToken } from '../middleware/auth';

const router = express. Router();
const JWT_SECRET = process.env.JWT_SECRET || 'zion_secret_key_2024_secure';

// Register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingUser = await runQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await runInsert(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const token = jwt.sign({ id: result.id, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      id: result.id,
      token,
      message: 'User registered successfully'
    });
  } catch (error:  any) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    const users:  any[] = await runQuery('SELECT * FROM users WHERE email = ? ', [email]);
    if (!users. length) {
      return res. status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        profile_picture: user. profile_picture,
        bio: user.bio
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', verifyToken, async (req: AuthRequest, res:  Response) => {
  try {
    const users: any[] = await runQuery('SELECT id, username, email, profile_picture, bio, status FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(users[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;