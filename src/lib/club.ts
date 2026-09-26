/**
 * Datos de marca del complejo. Es lo único (junto con el logo en /public y la paleta en
 * tailwind.config.js) que cambia entre la app de un complejo y la de otro.
 */
export const CLUB = {
  /** Nombre corto, para textos: "Torneos de Pádel · NODO" */
  nombre: 'NODO',
  /** Texto alternativo del logo */
  nombreCompleto: 'NODO Club de Pádel & Co.',
  /** Archivo en /public */
  logo: 'logo-nodo.webp',
}

export const logoUrl = () => `${import.meta.env.BASE_URL}${CLUB.logo}`
