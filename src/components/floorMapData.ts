/**
 * Map coordinates and layout definitions matching the nightclub's floor plans
 */

export interface TableLayout {
  number: string;
  name: string;
  floor: number;
  type: 'C' | 'M' | 'A' | 'S' | 'K';
  x: number; // percentage left
  y: number; // percentage top
  w?: number; // custom width
  h?: number; // custom height
}

export const floorMapTables: TableLayout[] = [
  // ==================== PISO 0 (Planta Baja) ====================
  // Grid 1: C1 to C9 (Top Circular Tables)
  { number: 'C1', name: 'Mesa Circular C1', floor: 0, type: 'C', x: 33, y: 24, w: 6, h: 6 },
  { number: 'C2', name: 'Mesa Circular C2', floor: 0, type: 'C', x: 42, y: 24, w: 6, h: 6 },
  { number: 'C3', name: 'Mesa Circular C3', floor: 0, type: 'C', x: 51, y: 24, w: 6, h: 6 },
  { number: 'C4', name: 'Mesa Circular C4', floor: 0, type: 'C', x: 33, y: 30, w: 6, h: 6 },
  { number: 'C5', name: 'Mesa Circular C5', floor: 0, type: 'C', x: 42, y: 30, w: 6, h: 6 },
  { number: 'C6', name: 'Mesa Circular C6', floor: 0, type: 'C', x: 51, y: 30, w: 6, h: 6 },
  { number: 'C7', name: 'Mesa Circular C7', floor: 0, type: 'C', x: 33, y: 36, w: 6, h: 6 },
  { number: 'C8', name: 'Mesa Circular C8', floor: 0, type: 'C', x: 42, y: 36, w: 6, h: 6 },
  { number: 'C9', name: 'Mesa Circular C9', floor: 0, type: 'C', x: 51, y: 36, w: 6, h: 6 },

  // M1, M2 (Yellow Squares top)
  { number: 'M1', name: 'Mesa Alta M1', floor: 0, type: 'M', x: 61, y: 24, w: 7, h: 6 },
  { number: 'M2', name: 'Mesa Alta M2', floor: 0, type: 'M', x: 71, y: 24, w: 7, h: 6 },

  // A1, A2 (Yellow Squares top bottom)
  { number: 'A1', name: 'Mesa Alta A1', floor: 0, type: 'M', x: 61, y: 32, w: 7, h: 6 },
  { number: 'A2', name: 'Mesa Alta A2', floor: 0, type: 'M', x: 71, y: 32, w: 7, h: 6 },

  // Grid 2: C10 to C18 (Middle Circular Tables)
  { number: 'C10', name: 'Mesa Circular C10', floor: 0, type: 'C', x: 5, y: 47, w: 6, h: 6 },
  { number: 'C11', name: 'Mesa Circular C11', floor: 0, type: 'C', x: 15, y: 47, w: 6, h: 6 },
  { number: 'C12', name: 'Mesa Circular C12', floor: 0, type: 'C', x: 25, y: 47, w: 6, h: 6 },
  { number: 'C13', name: 'Mesa Circular C13', floor: 0, type: 'C', x: 5, y: 53, w: 6, h: 6 },
  { number: 'C14', name: 'Mesa Circular C14', floor: 0, type: 'C', x: 15, y: 53, w: 6, h: 6 },
  { number: 'C15', name: 'Mesa Circular C15', floor: 0, type: 'C', x: 25, y: 53, w: 6, h: 6 },
  { number: 'C16', name: 'Mesa Circular C16', floor: 0, type: 'C', x: 5, y: 59, w: 6, h: 6 },
  { number: 'C17', name: 'Mesa Circular C17', floor: 0, type: 'C', x: 15, y: 59, w: 6, h: 6 },
  { number: 'C18', name: 'Mesa Circular C18', floor: 0, type: 'C', x: 25, y: 59, w: 6, h: 6 },

  // Center column VIP tables (orange squares)
  { number: 'M13', name: 'Mesa Alta VIP M13', floor: 0, type: 'M', x: 35, y: 50, w: 7, h: 6 },
  { number: 'M14', name: 'Mesa Alta VIP M14', floor: 0, type: 'M', x: 35, y: 57, w: 7, h: 6 },

  { number: 'M10', name: 'Mesa Alta VIP M10', floor: 0, type: 'M', x: 45, y: 46, w: 7, h: 6 },
  { number: 'M11', name: 'Mesa Alta VIP M11', floor: 0, type: 'M', x: 45, y: 53, w: 7, h: 6 },
  { number: 'M12', name: 'Mesa Alta VIP M12', floor: 0, type: 'M', x: 45, y: 60, w: 7, h: 6 },

  { number: 'M8', name: 'Mesa Alta VIP M8', floor: 0, type: 'M', x: 55, y: 49, w: 7, h: 6 },
  { number: 'M9', name: 'Mesa Alta VIP M9', floor: 0, type: 'M', x: 55, y: 56, w: 7, h: 6 },

  // Stage square tables
  { number: 'A3', name: 'Mesa Alta Escenario A3', floor: 0, type: 'M', x: 66, y: 45, w: 7, h: 6 },
  { number: 'A4', name: 'Mesa Alta Escenario A4', floor: 0, type: 'M', x: 66, y: 52, w: 7, h: 6 },
  { number: 'A5', name: 'Mesa Alta Escenario A5', floor: 0, type: 'M', x: 66, y: 59, w: 7, h: 6 },

  // C19, C20, C21 bottom row
  { number: 'C19', name: 'Mesa Circular C19', floor: 0, type: 'C', x: 22, y: 66, w: 6, h: 6 },
  { number: 'C20', name: 'Mesa Circular C20', floor: 0, type: 'C', x: 32, y: 66, w: 6, h: 6 },
  { number: 'C21', name: 'Mesa Circular C21', floor: 0, type: 'C', x: 42, y: 66, w: 6, h: 6 },

  // S lounges / bottom VIP row (Capsules)
  { number: 'A6', name: 'Sillón VIP A6', floor: 0, type: 'S', x: 53, y: 67, w: 11, h: 5 },
  { number: 'A7', name: 'Sillón VIP A7', floor: 0, type: 'S', x: 67, y: 67, w: 11, h: 5 },
  { number: 'S3', name: 'Sillón VIP S3', floor: 0, type: 'S', x: 81, y: 67, w: 11, h: 5 },

  { number: 'S4', name: 'Sillón VIP S4', floor: 0, type: 'S', x: 53, y: 73, w: 11, h: 5 },
  { number: 'S5', name: 'Sillón VIP S5', floor: 0, type: 'S', x: 67, y: 73, w: 11, h: 5 },
  { number: 'S6', name: 'Sillón VIP S6', floor: 0, type: 'S', x: 81, y: 73, w: 11, h: 5 },

  { number: 'S1', name: 'Sillón VIP Grande S1', floor: 0, type: 'S', x: 58, y: 79, w: 14, h: 5 },
  { number: 'S2', name: 'Sillón VIP Grande S2', floor: 0, type: 'S', x: 76, y: 79, w: 14, h: 5 },

  // Karaoke boxes (Left)
  { number: 'K1', name: 'KARAOKE 1', floor: 0, type: 'K', x: 3, y: 21, w: 23, h: 7 },
  { number: 'K2', name: 'KARAOKE 2', floor: 0, type: 'K', x: 3, y: 30, w: 23, h: 7 },


  // ==================== PISO 1 (Planta Alta) ====================
  // Center column A1 and M1-M4
  { number: 'A1', name: 'Mesa Circular VIP A1 (P1)', floor: 1, type: 'C', x: 48, y: 8, w: 6, h: 6 },
  { number: 'M1', name: 'Mesa Alta M1 (P1)', floor: 1, type: 'M', x: 48, y: 15, w: 7, h: 5 },
  { number: 'M2', name: 'Mesa Alta M2 (P1)', floor: 1, type: 'M', x: 48, y: 21, w: 7, h: 5 },
  { number: 'M3', name: 'Mesa Alta M3 (P1)', floor: 1, type: 'M', x: 48, y: 27, w: 7, h: 5 },
  { number: 'M4', name: 'Mesa Alta M4 (P1)', floor: 1, type: 'M', x: 48, y: 33, w: 7, h: 5 },

  // Left-top area
  { number: 'M5', name: 'Mesa Alta M5 (P1)', floor: 1, type: 'M', x: 28, y: 14, w: 7, h: 5 },
  { number: 'C1', name: 'Mesa C1 (P1)', floor: 1, type: 'M', x: 28, y: 25, w: 7, h: 5 },

  // Center-left column of round tables
  { number: 'C2', name: 'Mesa C2 (P1)', floor: 1, type: 'M', x: 31, y: 37, w: 7, h: 5 },
  { number: 'C3', name: 'Mesa C3 (P1)', floor: 1, type: 'M', x: 31, y: 44, w: 7, h: 5 },
  { number: 'C4', name: 'Mesa C4 (P1)', floor: 1, type: 'M', x: 31, y: 51, w: 7, h: 5 },

  // C5 to C8 grid
  { number: 'C5', name: 'Mesa C5 (P1)', floor: 1, type: 'M', x: 31, y: 60, w: 7, h: 5 },
  { number: 'C7', name: 'Mesa C7 (P1)', floor: 1, type: 'M', x: 41, y: 60, w: 7, h: 5 },
  { number: 'C6', name: 'Mesa C6 (P1)', floor: 1, type: 'M', x: 31, y: 66, w: 7, h: 5 },
  { number: 'C8', name: 'Mesa C8 (P1)', floor: 1, type: 'M', x: 41, y: 66, w: 7, h: 5 },

  // Right VIP Row of capsules (S1-S3)
  { number: 'S1', name: 'Sillón VIP S1 (P1)', floor: 1, type: 'S', x: 57, y: 47, w: 10, h: 5 },
  { number: 'S2', name: 'Sillón VIP S2 (P1)', floor: 1, type: 'S', x: 71, y: 47, w: 10, h: 5 },
  { number: 'S3', name: 'Sillón VIP S3 (P1)', floor: 1, type: 'S', x: 85, y: 47, w: 10, h: 5 },

  // Right VIP Row of circles (A2-A5)
  { number: 'A2', name: 'Mesa VIP A2 (P1)', floor: 1, type: 'C', x: 57, y: 56, w: 6, h: 6 },
  { number: 'A3', name: 'Mesa VIP A3 (P1)', floor: 1, type: 'C', x: 67, y: 56, w: 6, h: 6 },
  { number: 'A4', name: 'Mesa VIP A4 (P1)', floor: 1, type: 'C', x: 77, y: 56, w: 6, h: 6 },
  { number: 'A5', name: 'Mesa VIP A5 (P1)', floor: 1, type: 'C', x: 87, y: 56, w: 6, h: 6 },
];
