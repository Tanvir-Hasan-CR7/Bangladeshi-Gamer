export interface Profile {
  id: string;
  email: string;
  display_name?: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Rank {
  id: string;
  name: string;
  order: number;
}

export interface Staff {
  id: string;
  ign: string;
  uuid?: string;
  username?: string;
  rank_id: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  image_url?: string;
}

export interface PurchaseOption {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category_id: string;
  image_url?: string;
  product_type?: 'rank' | 'others';
  order: number;
  purchase_options?: PurchaseOption[];
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  ign: string;
  payment_method: string;
  sender_number: string;
  transaction_id: string;
  status: 'pending' | 'verified';
  total_amount: number;
  items: OrderItem[];
  created_at: string;
}

export interface VoteLink {
  id: string;
  name: string;
  url: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  author: string;
  image_url?: string;
  created_at: string;
}

export interface Settings {
  server_ip?: string;
  discord_link?: string;
  server_name?: string;
  server_icon?: string;
  primary_color?: string;
  secondary_color?: string;
  brand_color_1?: string;
  brand_color_2?: string;
  brand_name_split?: number;
  brand_name_first?: string;
  brand_name_second?: string;
  hero_bg_url?: string;
  patron_image_url?: string;
  rules_bg_url?: string;
  rules_border_color?: string;
  discord_order_webhook?: string;
  store_banner_url?: string;
  store_welcome_title?: string;
  store_welcome_description?: string;
  payment_number_bkash?: string;
  payment_number_nagad?: string;
  payment_number_rocket?: string;
  payment_info_bkash?: string;
  payment_info_nagad?: string;
  payment_info_rocket?: string;
  payment_info_other?: string;
  mysql_host?: string;
  mysql_port?: string | number;
  mysql_database?: string;
  mysql_user?: string;
  mysql_password?: string;
  mysql_jdbc_string?: string;
  supabase_url?: string;
  supabase_key?: string;
  supabase_table?: string;
  supabase_auto_sync?: boolean;
  supabase_sync_interval_mins?: number;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  order: number;
  created_at: string;
}

export interface AdminEmail {
  id: string;
  email: string;
  created_at: string;
}
