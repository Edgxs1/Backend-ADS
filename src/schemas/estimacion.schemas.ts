import { z } from 'zod';

export const TIPOS_ESTIMACION = ['Normal', 'Adicional', 'Extraordinaria'] as const;

/**
 * RF3.1 - Correspondencia estricta entre el tipo de estimación y el tipo del
 * catálogo de conceptos. El catálogo usa el masculino "Extraordinario".
 */
export const TIPO_CATALOGO_POR_ESTIMACION = {
  Normal: 'Normal',
  Adicional: 'Adicional',
  Extraordinaria: 'Extraordinario',
} as const;

export type TipoConceptoCatalogo =
  (typeof TIPO_CATALOGO_POR_ESTIMACION)[keyof typeof TIPO_CATALOGO_POR_ESTIMACION];

/**
 * Estados del flujo de estimaciones (RF3.2 / RF3.3 / RF3.8).
 *
 * Creada -> Por revisar -> Revisada -> Aprobada
 * Revisada -> Rechazada
 * Rechazada -> Por revisar
 */
export const ESTADOS_ESTIMACION = [
  'Creada',
  'Por revisar',
  'Revisada',
  'Rechazada',
  'Aprobada',
] as const;

export const TIPOS_CON_TOPES_25 = ['Adicional', 'Extraordinaria'] as const;

const fechaSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)');

const fechaOpcionalSchema = z
  .union([fechaSchema, z.literal('')])
  .nullish();

const textoOpcionalSchema = z.string().trim().max(255).nullish();

const fianzaSchema = z
  .union([z.string().trim().max(255), z.number().nonnegative()])
  .nullish();

/**
 * Datos de la carátula oficial que se conservan como snapshot JSONB.
 * Los campos son opcionales para mantener compatibilidad con clientes que
 * todavía no envían la carátula completa.
 */
export const metadataCaratulaSchema = z
  .object({
    descripcion: textoOpcionalSchema,
    hoja: textoOpcionalSchema,
    anticipo_total: fianzaSchema,
    fecha_contrato: fechaOpcionalSchema,
    fecha_adendum: fechaOpcionalSchema,
    rfc_contratista: textoOpcionalSchema,
    registro_iva: textoOpcionalSchema,
    registro_cmic: textoOpcionalSchema,
    registro_gacm: textoOpcionalSchema,
    numero_contrato: textoOpcionalSchema,
    numero_adendum: textoOpcionalSchema,
    lugar_obra: textoOpcionalSchema,
    fianza_cumplimiento: fianzaSchema,
    fianza_anticipo: fianzaSchema,
    periodo_ejecucion: textoOpcionalSchema,
    numero_fianza_cumplimiento: textoOpcionalSchema,
    fecha_fianza_cumplimiento: fechaOpcionalSchema,
    numero_fianza_anticipo: textoOpcionalSchema,
    fecha_fianza_anticipo: fechaOpcionalSchema,
  })
  .catchall(z.unknown());

const numeroOpcionalSchema = z.number().nonnegative().nullish();

const conceptoEstimacionSchema = z
  .object({
    id_concepto: z.uuid(),
    /**
     * `cantidad` se conserva por compatibilidad; el flujo nuevo envía
     * `cantidad_de_esta_estimacion`.
     */
    cantidad: z.number().positive('La cantidad debe ser mayor a 0').optional(),
    cantidad_de_esta_estimacion: z
      .number()
      .positive('La cantidad debe ser mayor a 0')
      .optional(),
    clave: z.string().trim().max(100).nullish(),
    descripcion: z.string().trim().nullish(),
    unidad_medida: z.string().trim().max(50).nullish(),
    cantidad_segun_proyecto: numeroOpcionalSchema,
    cantidad_hasta_estimacion_anterior: numeroOpcionalSchema,
    cantidad_total_estimado: numeroOpcionalSchema,
    cantidad_por_ejecutar: numeroOpcionalSchema,
    precio_unitario_snapshot: numeroOpcionalSchema,
    importe: numeroOpcionalSchema,
    avance_fisico_monetizado: numeroOpcionalSchema,
    avance_financiero_cobrado: numeroOpcionalSchema,
  })
  .refine(
    (concepto) =>
      concepto.cantidad !== undefined ||
      concepto.cantidad_de_esta_estimacion !== undefined,
    {
      message: 'Debes indicar la cantidad de esta estimación',
      path: ['cantidad_de_esta_estimacion'],
    },
  )
  .transform((concepto) => ({
    ...concepto,
    cantidad:
      concepto.cantidad ??
      concepto.cantidad_de_esta_estimacion ??
      0,
  }));

export const conceptosEstimacionSchema = z
  .array(conceptoEstimacionSchema)
  .min(1, 'Debe incluir al menos un concepto');

export const crearEstimacionSchema = z
  .object({
    id_obra: z.uuid().optional(),
    tipo: z.enum(TIPOS_ESTIMACION, 'Tipo de estimación inválido'),
    fecha: fechaSchema,
    periodo_inicio: fechaSchema,
    periodo_fin: fechaSchema,
    metadata_caratula: metadataCaratulaSchema.optional(),
    conceptos: conceptosEstimacionSchema,
    amortizacion: z.number().nonnegative().optional(),
    retencion_manual: z.number().nonnegative().optional(),
  })
  .refine(
    (data) => data.periodo_fin >= data.periodo_inicio,
    {
      message: 'El periodo_fin no puede ser anterior al periodo_inicio',
      path: ['periodo_fin'],
    },
  );

/**
 * El PUT reutiliza las mismas reglas de captura. El folio y el id_obra no se
 * aceptan desde el cliente: se conservan de la estimación existente.
 */
export const actualizarEstimacionSchema = crearEstimacionSchema;

export const estimacionObraParamsSchema = z.object({
  id_obra: z.uuid(),
});

export const estimacionParamsSchema = z.object({
  id_obra: z.uuid(),
  id_estimacion: z.uuid(),
});

export const estimacionIdParamsSchema = z.object({
  id: z.uuid(),
});

export const correccionEstatusSchema = z.object({
  estado: z.enum(ESTADOS_ESTIMACION, 'Estado inválido'),
});

export const cambiarEstadoEstimacionSchema = z.object({
  estado: z.enum(ESTADOS_ESTIMACION, 'Estado inválido'),
  password: z.string().min(1, 'La contraseña no puede estar vacía').max(200).optional(),
});

export type CrearEstimacionDto = z.infer<typeof crearEstimacionSchema>;
export type ActualizarEstimacionDto = z.infer<typeof actualizarEstimacionSchema>;
export type MetadataCaratulaDto = z.infer<typeof metadataCaratulaSchema>;
export type ConceptoEstimacionDto = z.infer<typeof conceptosEstimacionSchema>[number];
export type TipoEstimacion = (typeof TIPOS_ESTIMACION)[number];
export type EstadoEstimacion = (typeof ESTADOS_ESTIMACION)[number];
export type CorreccionEstatusDto = z.infer<typeof correccionEstatusSchema>;
export type CambiarEstadoEstimacionDto = z.infer<typeof cambiarEstadoEstimacionSchema>;
