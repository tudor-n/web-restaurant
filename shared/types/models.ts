export type UUID = string;
export type ISODateString = string;

export interface Category {
  id: UUID;
  name: string;
  sort_order: number | null;
}

export interface Product {
  id: UUID;
  category_id: UUID;
  category_name: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
}


export interface RestaurantTable {
  id: UUID;
  table_number: string | null;
  qr_token: UUID | null;
}

export interface TableSession {
  table_id: UUID;
  order_id: UUID;
  session_token: string;
}


export type OrderStatus = 'draft' | 'submitted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface OrderItem {
  id: UUID;
  order_id: UUID;
  product_id: UUID;
  product: Pick<Product, 'id' | 'name' | 'price' | 'image_url'>;
  quantity: number;
  unit_price_at_purchase: number;
  was_ai_recommended: boolean;
  is_flash_deal_item: boolean;
}

export interface Order {
  id: UUID;
  table_id: UUID;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  items: OrderItem[];
  created_at: ISODateString;
}

export interface CartItem {
  product: Product;
  quantity: number;
}


export type FlashDealStatus = 'pending' | 'claimed' | 'expired';
export type FlashDealTrigger = 'post_order' | 'time_based' | 'slow_item';

export interface FlashDeal {
  id: UUID;
  menu_item_id: UUID;
  menu_item: Pick<Product, 'id' | 'name' | 'price' | 'image_url'>;
  discount_percent: number;
  discounted_price: number;
  trigger: FlashDealTrigger;
  countdown_seconds: number;
  expires_at: ISODateString;
  reason: string;
  is_active: boolean;
  created_at: ISODateString;
}


export type RecommendationType = 'pairing' | 'upsell' | 'flash_deal';
export type RecommendationReasonType =
  | 'chef_pick'
  | 'pairs_with_order'
  | 'popular_combo'
  | 'time_based'
  | 'flash_deal';
export type RecommendationSource = 'ai' | 'manual' | 'rule_based';

export interface Recommendation {
  id: UUID;
  type: RecommendationType;
  menu_item: Pick<Product, 'id' | 'name' | 'description' | 'price' | 'image_url' | 'category_name'>;
  reason: string;
  reason_type: RecommendationReasonType;
  discount: {
    percent: number | null;
    original_price: number | null;
    discounted_price: number | null;
  };
  confidence: number;
  source: RecommendationSource;
}


export interface FlashDealConfig {
  enabled: boolean;
  max_deals_per_session: number;
  countdown_seconds: number;
  discount_percent: number;
}

export interface AdminAIConfig {
  id: UUID;
  date: ISODateString;
  daily_prompt: string;
  promoted_items: UUID[];
  suppressed_items: UUID[];
  flash_deal_config: FlashDealConfig;
  created_by: UUID;
  created_at: ISODateString;
}

export interface AIDirective {
  id: UUID;
  raw_prompt: string | null;
  parsed_rules: Record<string, unknown> | null;
  created_at: ISODateString;
  is_active: boolean | null;
}


export type SimilarityRelationship = 'pairs_with' | 'upgrade_to' | 'follow_with' | 'same_vibe';

export interface SimilarityRule {
  id: UUID;
  source_item_id: UUID | null;
  source_category_id: UUID | null;
  target_item_id: UUID;
  relationship: SimilarityRelationship;
  weight: number;
  is_auto_generated: boolean;
  created_at: ISODateString;
}


export interface DailyMetrics {
  date: ISODateString;
  flash_deals_shown: number;
  flash_deals_claimed: number;
  recommendation_clicks: number;
  upsell_revenue: number;
}
