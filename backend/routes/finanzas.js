const express = require('express');

const router = express.Router();
const { authenticate } = require('../middleware/auth');
const FinanzasService = require('../services/finanzasService');
const { asyncHandler } = require('../utils/asyncHandler');

// Middleware para asegurar que todas las rutas de finanzas requieren autenticación
router.use(authenticate);

/**
 * @swagger
 * /api/finanzas/summary:
 *   get:
 *     summary: Obtiene un resumen financiero general.
 *     description: Calcula y devuelve los ingresos brutos, costo de ventas, ganancia bruta, gastos operativos y ganancia neta para un período determinado.
 *     tags: [Finanzas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Fecha de inicio del período (YYYY-MM-DD).
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         description: Fecha de fin del período (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Resumen financiero calculado con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 periodo:
 *                   type: object
 *                   properties:
 *                     inicio: { type: string, format: date }
 *                     fin: { type: string, format: date }
 *                 ingresosBrutos: { type: number }
 *                 costoDeVentas: { type: number }
 *                 gananciaBruta: { type: number }
 *                 gastosOperativos: { type: number }
 *                 gananciaNeta: { type: number }
 *       400:
 *         description: Fechas no proporcionadas o en formato incorrecto.
 *       500:
 *         description: Error del servidor.
 */
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ message: 'Las fechas de inicio y fin son requeridas.' });
    }

    const negocioId = req.negocioId;
    const finanzasService = new FinanzasService(negocioId);

    const summary = await finanzasService.getFinancialSummary(fechaInicio, fechaFin);

    res.status(200).json(summary);
  })
);

router.get(
  '/cuentas-por-cobrar',
  asyncHandler(async (req, res) => {
    const { estado, vencidas } = req.query;
    const negocioId = req.negocioId;
    const finanzasService = new FinanzasService(negocioId);

    const soloVencidas = vencidas === 'true';
    const data = await finanzasService.getCuentasPorCobrar(estado, soloVencidas);

    res.status(200).json({ success: true, ...data });
  })
);

router.get(
  '/cuentas-por-pagar',
  asyncHandler(async (req, res) => {
    const { estado, vencidas } = req.query;
    const negocioId = req.negocioId;
    const finanzasService = new FinanzasService(negocioId);

    const soloVencidas = vencidas === 'true';
    const data = await finanzasService.getCuentasPorPagar(estado, soloVencidas);

    res.status(200).json({ success: true, ...data });
  })
);

module.exports = router;
