import { Product, PurchaseOption } from '../types';

/**
 * Checks and extracts purchase options from a product.
 * Supports direct database field and description-encoded metadata as a fallback.
 */
export function getProductPurchaseOptions(product: Product): PurchaseOption[] {
  if (!product) return [];

  // 1. Direct field fallback
  if (product.purchase_options && Array.isArray(product.purchase_options)) {
    return product.purchase_options;
  }
  
  // 2. Custom check for a dynamic property from the database
  const rawOptions = (product as any).purchase_options;
  if (rawOptions) {
    if (Array.isArray(rawOptions)) return rawOptions;
    if (typeof rawOptions === 'string') {
      try {
        const parsed = JSON.parse(rawOptions);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
    }
  }

  // 3. Fallback to description block encoding
  if (product.description && product.description.includes('[OPTIONS:')) {
    try {
      const match = product.description.match(/\[OPTIONS:([\s\S]*?)\]/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error parsing purchase options from description:', e);
    }
  }

  return [];
}

/**
 * Extracts a clean user-visible description without any options metadata tags.
 */
export function getCleanDescription(product: Product): string {
  if (!product || !product.description) return '';
  if (product.description.includes('[OPTIONS:')) {
    return product.description.replace(/\[OPTIONS:([\s\S]*?)\]/g, '').trim();
  }
  return product.description;
}

/**
 * Prepares the description when saving. Appends purchase options as metadata tag if column fallback is active.
 */
export function encodeDescriptionWithOptions(description: string, options: PurchaseOption[]): string {
  const baseDesc = description.replace(/\[OPTIONS:([\s\S]*?)\]/g, '').trim();
  if (!options || options.length === 0) return baseDesc;
  return `${baseDesc}\n\n[OPTIONS:${JSON.stringify(options)}]`.trim();
}
