export interface Category {
    id: string
    name: string
    sort_order: number | null
}

export interface Product {
    id: string
    category_id: string
    name: string
    description: string
    price: number 
    image_url: string
    is_available: boolean
}

export interface Recommendation {
    id: string 
    type: 'pairing' | 'upsell' | 'flash_deal'
    menu_item: {
        id: string
        name: string
        description: string | null
        price: number
        image_url: string | null
        category_name: string

    }
    reason: string
    reasond_type: 'chef_pick' | 'pairs_with_order' | 'popular_combo' | 'time_based' | 'flash_deal'
    discount: {
        percent: number | null
        original_price: number
        discounted_price: number | null
    }
    confidence: number
    source: 'ai' | 'manual' | 'rule_based'

}

export interface FlashDeal {
    id: string
    order_id: string
    product_id: string
    product?: Product
    discount_price: number
    expires_at: string
    status: 'pending' | 'claimed' | 'expired'
}

export interface AdminAIConfig {
    id: string
    raw_prompt: string
    parsed_rules: Record<string, any>
    is_active: boolean
    creates_at: string
}

export interface MenuResponse {
    categories: Category[]
    products: Product[]
}