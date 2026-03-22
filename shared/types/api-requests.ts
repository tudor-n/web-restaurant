import type { UUID, SimilarityRelationship, FlashDealConfig } from './models';

export interface CreateOrderRequest {
  table_id: UUID;
}

export interface UpdateOrderItemsRequest {
  items: {
    product_id: UUID;
    quantity: number;
  }[];
}


export interface ClaimFlashDealRequest {
  selected_modifiers?: {
    modifier_id: UUID;
    option_id: UUID;
  }[];
}


export interface PostAdminAIConfigRequest {
  daily_prompt: string;
  promoted_items: UUID[];
  suppressed_items: UUID[];
  flash_deal_config: FlashDealConfig;
}


export interface CreateSimilarityRuleRequest {
  source_item_id: UUID | null;
  source_category_id: UUID | null;
  target_item_id: UUID;
  relationship: SimilarityRelationship;
  weight?: number;
}

export interface AutoGenerateSimilarityRulesRequest {
  min_co_occurrence?: number;
  lookback_days?: number;
}


export interface TriggerFlashDealRequest {
  product_id: UUID;
  discount_percent: number;
  countdown_seconds: number;
}
