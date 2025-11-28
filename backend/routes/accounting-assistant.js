const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const IAAccountingAssistant = require('../services/ia-accounting-assistant');

const assistant = new IAAccountingAssistant();

// Middleware para asegurar que el usuario tiene permisos de contabilidad (admin o contador)
// Por ahora solo admin
const requireAccountingPermission = (req, res, next) => {
  if (req.user && (req.user.rol === 'admin' || req.user.rol === 'super_admin')) {
    next();
  } else {
    res
      .status(403)
      .json({ success: false, message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};

router.get('/status', authenticate, requireAccountingPermission, async (req, res) => {
  try {
    const negocioId = req.headers['x-negocio-id'] || req.user.negocioId;
    if (!negocioId) {
      return res.status(400).json({ success: false, message: 'Negocio ID requerido' });
    }
    const status = await assistant.analyzeTaxStatus(negocioId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error en /status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  '/generate-declaration',
  authenticate,
  requireAccountingPermission,
  async (req, res) => {
    try {
      const { type, year, month } = req.body;
      const negocioId = req.headers['x-negocio-id'] || req.user.negocioId;

      if (!negocioId || !type || !year || !month) {
        return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
      }

      const declaration = await assistant.generateDeclaration(negocioId, type, year, month);
      res.json({ success: true, data: declaration });
    } catch (error) {
      console.error('Error en /generate-declaration:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.post('/ask', authenticate, requireAccountingPermission, async (req, res) => {
  try {
    const { query } = req.body;
    const negocioId = req.user.negocioId;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Consulta requerida' });
    }

    if (!negocioId) {
      return res
        .status(400)
        .json({ success: false, message: 'ID de negocio no encontrado en la sesión.' });
    }

    const answer = await assistant.askAssistant(query, {}, negocioId);
    res.json({ success: true, answer });
  } catch (error) {
    console.error('Error en /ask:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
