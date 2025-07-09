import { Router } from 'express';

const router = Router();

// Debug endpoint to view thread mappings (development only)
router.get('/threads', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Import ThreadStorage dynamically to avoid circular dependency
  import('../utils/threadStorage.js')
    .then(({ ThreadStorage }) => {
      const storage = new ThreadStorage();
      res.status(200).json({
        threadCount: storage.size(),
        threads: storage.getAll(),
      });
    })
    .catch(error => {
      console.error('Failed to load thread data', error);
      res.status(500).json({ error: 'Failed to load thread data' });
    });
});

// Debug endpoint to view all registered routes (development only)
router.get('/routes', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Simple route listing based on our known routes
    const routes = [
      { method: 'GET', path: '/health' },
      { method: 'POST', path: '/api/send-message' },
      { method: 'POST', path: '/slack/events' },
      { method: 'GET', path: '/debug/threads' },
      { method: 'GET', path: '/debug/routes' },
    ];

    res.status(200).json({
      routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
      count: routes.length,
    });
  } catch (error) {
    console.error('Failed to extract routes', error);
    res.status(500).json({ error: 'Failed to extract routes' });
  }
});

export { router as debugRouter };
