/** GET /api/categories yanıtındaki bir kayıt */
export interface Category {
  id: number;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

/** POST ve PUT gövdesi. description: null gönderilirse açıklama silinir. */
export interface CategoryInput {
  name: string;
  description?: string | null;
}