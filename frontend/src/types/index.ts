export interface UserSummary {
  id: number;
  full_name: string;
  avatar_url?: string;
  headline?: string;
  trust_score: number;
  address_display?: string;
  distance_km?: number;
  distance_display?: string;
  badges?: string[];
}

export interface UserSkill {
  id: number;
  user_id: number;
  skill_id: number;
  skill_name: string;
  category: string;
  icon: string;
  skill_type: 'OFFERED' | 'NEEDED';
  experience_level: string;
  description?: string;
  created_at?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  headline?: string;
  address_display?: string;
  latitude?: number;
  longitude?: number;
  exchange_radius_km: number;
  location_visibility: string;
  availability: string;
  primary_intent: string;
  trust_score: number;
  reliability_score: number;
  response_rate: number;
  skill_quality_score: number;
  completed_exchanges_count: number;
  reviews_count: number;
  badges: string[];
  is_active: boolean;
  is_admin: boolean;
  onboarding_completed: boolean;
  created_at: string;
  skills?: UserSkill[];
}

export interface PublicProfile extends UserSummary {
  bio?: string;
  availability?: string;
  reliability_score: number;
  response_rate: number;
  completed_exchanges_count: number;
  reviews_count: number;
  skills_offered: string[];
  skills_needed: string[];
  skills_detail?: UserSkill[];
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  icon: string;
  description?: string;
  popularity?: number;
}

export interface Exchange {
  id: number;
  requester_id: number;
  receiver_id: number;
  requester_skill_id?: number;
  receiver_skill_id?: number;
  requester_skill_name?: string;
  receiver_skill_name?: string;
  status: 'PENDING' | 'ACCEPTED' | 'COUNTERED' | 'REJECTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  proposal_message: string;
  counter_message?: string;
  preferred_date?: string;
  estimated_hours: number;
  location_area?: string;
  requester_completed: boolean;
  receiver_completed: boolean;
  cancellation_reason?: string;
  cancelled_by_id?: number;
  created_at: string;
  updated_at: string;
  requester: UserSummary;
  receiver: UserSummary;
  user_can_review?: boolean;
  has_reviewed?: boolean;
}

export interface Review {
  id: number;
  exchange_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  reliability_score: number;
  skill_quality_score: number;
  would_exchange_again: boolean;
  comment?: string;
  created_at: string;
  reviewer: UserSummary;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  exchange_id?: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner: UserSummary;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  active_exchange_id?: number;
  active_exchange_status?: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Connection {
  id: number;
  user_id: number;
  connected_user_id: number;
  status: string;
  created_at: string;
  partner: UserSummary;
}

export interface Post {
  id: number;
  author_id: number;
  post_type: 'OFFER' | 'REQUEST' | 'COMPLETED_EXCHANGE' | 'COMMUNITY' | 'RECOMMENDATION';
  title: string;
  content: string;
  skill_id?: number;
  exchange_id?: number;
  partner_id?: number;
  likes_count: number;
  created_at: string;
  author: UserSummary;
  skill?: Skill;
  partner?: UserSummary;
  distance_display?: string;
}

export interface MatchResult {
  candidate: UserSummary;
  match_score: number;
  distance_km: number;
  distance_display: string;
  is_reciprocal: boolean;
  they_offer: string[];
  they_need: string[];
  matched_you_offer: string[];
  matched_they_offer: string[];
  reasons: string[];
  score_breakdown: {
    skill_compatibility: number;
    location_proximity: number;
    trust: number;
    availability: number;
  };
}

export interface CommunityStats {
  members_nearby: number;
  skills_available: number;
  exchanges_completed: number;
  average_trust_score: number;
  popular_skills: Skill[];
  recent_exchanges: Array<{
    id: number;
    requester_name: string;
    receiver_name: string;
    requester_skill: string;
    receiver_skill: string;
    completed_at: string;
  }>;
}
