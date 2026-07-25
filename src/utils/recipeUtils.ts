/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, CartItem, isPhysicalProduct } from '../types';

/**
 * Checks if a physical bottle product is currently open in a specific Caja.
 */
export function isBottleOpen(product: Product, cajaName: string): boolean {
  if (!product) return false;
  if (product.cajaOpenBottlesCount && (product.cajaOpenBottlesCount[cajaName] ?? 0) > 0) {
    return true;
  }
  if (product.openBottles && product.openBottles[cajaName] === true) {
    return true;
  }
  if (product.cajaMl && (product.cajaMl[cajaName] ?? 0) > 0) {
    return true;
  }
  return false;
}

/**
 * Determines if a product is a physical bottle/mixer that requires opening control ("control de apertura").
 */
export function isOpeningControlledProduct(p: Product): boolean {
  if (!p) return false;
  if (p.isOpeningControlled === false) return false;
  if (p.isOpeningControlled === true) return true;

  // By default, physical products in warehouse/bar that are bottles, liquors or mixers have opening control
  if (!isPhysicalProduct(p)) return false;
  
  if (p.bottleConfig?.isBottle) return true;
  if ((p.unit || '').toLowerCase().includes('botella')) return true;

  const catLower = (p.category || '').toLowerCase();
  const liquorCategories = ['whisky', 'ron', 'vodka', 'tequila', 'gin', 'singani', 'licor', 'destilados', 'refrescos', 'mezcladores'];
  if (liquorCategories.some(c => catLower.includes(c))) return true;

  return false;
}

/**
 * Finds matching physical ingredient products for a given POS beverage/product or recipe.
 * Uses the product's Firestore recipe if present, or dynamically resolves it from the catalog.
 */
export function getRecipeIngredients(product: Product, allProducts: Product[]): Product[] {
  if (!product) return [];

  // 1. Direct Firestore Recipe
  if (product.recipe && Array.isArray(product.recipe.ingredients) && product.recipe.ingredients.length > 0) {
    const ingredients: Product[] = [];
    for (const ing of product.recipe.ingredients) {
      const found = allProducts.find(p => p.id === ing.productId && p.isActive);
      if (found) {
        ingredients.push(found);
      }
    }
    if (ingredients.length > 0) return ingredients;
  }

  // 2. If the product ITSELF is already a physical bottle item
  if (isPhysicalProduct(product) && isOpeningControlledProduct(product)) {
    return [product];
  }

  // 3. Dynamic Catalog Matching based on Product Name/Category and official recipes
  const nameLower = (product.name || '').toLowerCase().trim();
  const matchedPhysicals: Product[] = [];

  const physicalProducts = allProducts.filter(p => p.isActive && isPhysicalProduct(p));

  // Helper to find physical product by keyword search
  const findPhysical = (...keywords: string[]): Product | undefined => {
    return physicalProducts.find(p => {
      const pName = (p.name || '').toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      return keywords.every(kw => pName.includes(kw) || pCat.includes(kw) || pBrand.includes(kw));
    });
  };

  // Fernet + Coca Cola
  if (nameLower.includes('fernet')) {
    const fernet = findPhysical('fernet') || findPhysical('branca');
    if (fernet) matchedPhysicals.push(fernet);
    if (nameLower.includes('vaso') || nameLower.includes('coca') || nameLower.includes('trago')) {
      const coca = findPhysical('coca');
      if (coca) matchedPhysicals.push(coca);
    }
  }
  // Singani / Chuflay
  else if (nameLower.includes('singani') || nameLower.includes('chuflay')) {
    const singani = findPhysical('singani') || findPhysical('casa real');
    if (singani) matchedPhysicals.push(singani);
    const mixer = findPhysical('ginger') || findPhysical('sante') || findPhysical('sprite');
    if (mixer) matchedPhysicals.push(mixer);
  }
  // Ron / Mojito
  else if (nameLower.includes('ron') || nameLower.includes('mojito') || nameLower.includes('daiquiri')) {
    const ron = findPhysical('ron') || findPhysical('havana') || findPhysical('lenguas');
    if (ron) matchedPhysicals.push(ron);
    if (nameLower.includes('mojito') || nameLower.includes('coca') || nameLower.includes('sprite')) {
      const mixer = findPhysical('sprite') || findPhysical('coca');
      if (mixer) matchedPhysicals.push(mixer);
    }
  }
  // Gin / Tónica
  else if (nameLower.includes('gin')) {
    const gin = findPhysical('gin') || findPhysical('beefeater') || findPhysical('insurgente');
    if (gin) matchedPhysicals.push(gin);
    const tonica = findPhysical('tonica') || findPhysical('tónica') || findPhysical('sante');
    if (tonica) matchedPhysicals.push(tonica);
  }
  // Vodka
  else if (nameLower.includes('vodka')) {
    const vodka = findPhysical('vodka') || findPhysical('1825') || findPhysical('sernova') || findPhysical('stoli');
    if (vodka) matchedPhysicals.push(vodka);
    const mixer = findPhysical('sprite') || findPhysical('citrus');
    if (mixer) matchedPhysicals.push(mixer);
  }
  // Whisky
  else if (nameLower.includes('whisky') || nameLower.includes('jack') || nameLower.includes('chivas') || nameLower.includes('red label') || nameLower.includes('black label')) {
    const whisky = findPhysical('whisky') || findPhysical('jack') || findPhysical('chivas') || findPhysical('label');
    if (whisky) matchedPhysicals.push(whisky);
    if (nameLower.includes('coca') || nameLower.includes('mezclado')) {
      const coca = findPhysical('coca');
      if (coca) matchedPhysicals.push(coca);
    }
  }
  // Tequila
  else if (nameLower.includes('tequila')) {
    const tequila = findPhysical('tequila') || findPhysical('jose cuervo') || findPhysical('don julio') || findPhysical('el jimador');
    if (tequila) matchedPhysicals.push(tequila);
  }
  // Jäger
  else if (nameLower.includes('jager') || nameLower.includes('jäger')) {
    const jager = findPhysical('jager') || findPhysical('jäger') || findPhysical('meister');
    if (jager) matchedPhysicals.push(jager);
    if (nameLower.includes('bomb') || nameLower.includes('red bull')) {
      const redbull = findPhysical('red bull') || findPhysical('redbull');
      if (redbull) matchedPhysicals.push(redbull);
    }
  }

  return matchedPhysicals;
}

/**
 * Analyzes a full POS sale cart (all products sold) and identifies all required physical bottles.
 * Filters out bottles that are already open in the active Caja.
 * Deduplicates and returns only the physical bottle products that NEED to be opened.
 */
export function getMissingOpenBottlesForCart(
  cart: CartItem[],
  allProducts: Product[],
  cajaName: string
): Product[] {
  const allRequiredPhysicals: Product[] = [];

  for (const item of cart) {
    if (item.isCocktail) {
      // Virtual cocktail in POS
      if (item.cocktailLiquorId) {
        const liquor = allProducts.find(p => p.id === item.cocktailLiquorId);
        if (liquor && isOpeningControlledProduct(liquor)) {
          allRequiredPhysicals.push(liquor);
        }
      }
      if (item.cocktailMixerId) {
        const mixer = allProducts.find(p => p.id === item.cocktailMixerId);
        if (mixer && isOpeningControlledProduct(mixer)) {
          allRequiredPhysicals.push(mixer);
        }
      }
    } else {
      // Standard product or recipe item in POS
      const ingredients = getRecipeIngredients(item.product, allProducts);
      for (const ing of ingredients) {
        if (isOpeningControlledProduct(ing)) {
          allRequiredPhysicals.push(ing);
        }
      }
    }
  }

  // Deduplicate physical products by ID
  const uniquePhysicalsMap = new Map<string, Product>();
  for (const prod of allRequiredPhysicals) {
    if (!uniquePhysicalsMap.has(prod.id)) {
      uniquePhysicalsMap.set(prod.id, prod);
    }
  }

  // Filter ONLY those that are NOT open yet in the active Caja
  const missingOpenBottles: Product[] = [];
  uniquePhysicalsMap.forEach(prod => {
    if (!isBottleOpen(prod, cajaName)) {
      missingOpenBottles.push(prod);
    }
  });

  return missingOpenBottles;
}
