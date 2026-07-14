export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      intake_session_categories: {
        Row: {
          category_id: string
          created_at: string
          session_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          session_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_session_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "medication_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_categories_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_session_eligibility_results: {
        Row: {
          evaluated_at: string
          id: string
          medicine_id: string
          reason: string | null
          result: Database["public"]["Enums"]["eligibility_result"]
          session_id: string
        }
        Insert: {
          evaluated_at?: string
          id?: string
          medicine_id: string
          reason?: string | null
          result: Database["public"]["Enums"]["eligibility_result"]
          session_id: string
        }
        Update: {
          evaluated_at?: string
          id?: string
          medicine_id?: string
          reason?: string | null
          result?: Database["public"]["Enums"]["eligibility_result"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_session_eligibility_results_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_eligibility_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_session_medicines: {
        Row: {
          category_id: string
          created_at: string
          medicine_id: string
          session_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          medicine_id: string
          session_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          medicine_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_session_medicines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "medication_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_medicines_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_medicines_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_session_questionnaire_responses: {
        Row: {
          answer_boolean: boolean | null
          answer_number: number | null
          answer_option_ids: string[]
          answer_text: string | null
          created_at: string
          id: string
          medicine_id: string
          question_id: string
          session_id: string
        }
        Insert: {
          answer_boolean?: boolean | null
          answer_number?: number | null
          answer_option_ids?: string[]
          answer_text?: string | null
          created_at?: string
          id?: string
          medicine_id: string
          question_id: string
          session_id: string
        }
        Update: {
          answer_boolean?: boolean | null
          answer_number?: number | null
          answer_option_ids?: string[]
          answer_text?: string | null
          created_at?: string
          id?: string
          medicine_id?: string
          question_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_session_questionnaire_responses_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_questionnaire_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intake_session_questionnaire_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sessions: {
        Row: {
          claimed_by_user_id: string | null
          created_at: string
          dob: string | null
          email: string | null
          expires_at: string
          full_name: string | null
          height_cm: number | null
          id: string
          phone: string | null
          selected_plan_id: string | null
          session_token: string
          sex: Database["public"]["Enums"]["sex_type"] | null
          state_code: string | null
          status: Database["public"]["Enums"]["intake_session_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          claimed_by_user_id?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          expires_at?: string
          full_name?: string | null
          height_cm?: number | null
          id?: string
          phone?: string | null
          selected_plan_id?: string | null
          session_token: string
          sex?: Database["public"]["Enums"]["sex_type"] | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["intake_session_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          claimed_by_user_id?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          expires_at?: string
          full_name?: string | null
          height_cm?: number | null
          id?: string
          phone?: string | null
          selected_plan_id?: string | null
          session_token?: string
          sex?: Database["public"]["Enums"]["sex_type"] | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["intake_session_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intake_sessions_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_categories: {
        Row: {
          created_at: string
          description: string | null
          eligibility_rules: Json
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          eligibility_rules?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          eligibility_rules?: Json
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medication_category_medicines: {
        Row: {
          category_id: string
          created_at: string
          medicine_id: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          medicine_id: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          medicine_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "medication_category_medicines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "medication_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_category_medicines_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_relationships: {
        Row: {
          created_at: string
          id: string
          medicine_a_id: string
          medicine_b_id: string
          reason: string | null
          relationship: Database["public"]["Enums"]["medication_relationship"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_a_id: string
          medicine_b_id: string
          reason?: string | null
          relationship: Database["public"]["Enums"]["medication_relationship"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          medicine_a_id?: string
          medicine_b_id?: string
          reason?: string | null
          relationship?: Database["public"]["Enums"]["medication_relationship"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_relationships_medicine_a_id_fkey"
            columns: ["medicine_a_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_relationships_medicine_b_id_fkey"
            columns: ["medicine_b_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          important_info: Json
          is_active: boolean
          long_description: string | null
          name: string
          notice_text: string | null
          price_monthly: number
          requires_questionnaire: boolean
          short_description: string
          sort_order: number
          status: Database["public"]["Enums"]["medicine_status"]
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          important_info?: Json
          is_active?: boolean
          long_description?: string | null
          name: string
          notice_text?: string | null
          price_monthly?: number
          requires_questionnaire?: boolean
          short_description: string
          sort_order?: number
          status?: Database["public"]["Enums"]["medicine_status"]
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          important_info?: Json
          is_active?: boolean
          long_description?: string | null
          name?: string
          notice_text?: string | null
          price_monthly?: number
          requires_questionnaire?: boolean
          short_description?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["medicine_status"]
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          clinical_note: string | null
          created_at: string
          duration_months: number
          features: Json
          id: string
          is_active: boolean
          is_most_popular: boolean
          medicine_id: string
          name: string
          original_price: number
          price: number
          sort_order: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          clinical_note?: string | null
          created_at?: string
          duration_months: number
          features?: Json
          id?: string
          is_active?: boolean
          is_most_popular?: boolean
          medicine_id: string
          name: string
          original_price?: number
          price?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          clinical_note?: string | null
          created_at?: string
          duration_months?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_most_popular?: boolean
          medicine_id?: string
          name?: string
          original_price?: number
          price?: number
          sort_order?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          plan_id: string | null
          raw_event: Json | null
          session_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          plan_id?: string | null
          raw_event?: Json | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          plan_id?: string | null
          raw_event?: Json | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          dob: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          postal_code: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          state_code: string | null
          street_address: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          postal_code?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          state_code?: string | null
          street_address?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          postal_code?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          state_code?: string | null
          street_address?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          amount_off_cents: number | null
          auto_apply: boolean
          code: string
          created_at: string
          currency: string
          discount_type: string
          duration: string
          duration_in_months: number | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          percent_off: number | null
          redeem_by: string | null
          stripe_coupon_id: string | null
          stripe_promotion_code_id: string | null
          times_redeemed: number
          updated_at: string
        }
        Insert: {
          amount_off_cents?: number | null
          auto_apply?: boolean
          code: string
          created_at?: string
          currency?: string
          discount_type: string
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
          redeem_by?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Update: {
          amount_off_cents?: number | null
          auto_apply?: boolean
          code?: string
          created_at?: string
          currency?: string
          discount_type?: string
          duration?: string
          duration_in_months?: number | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          percent_off?: number | null
          redeem_by?: string | null
          stripe_coupon_id?: string | null
          stripe_promotion_code_id?: string | null
          times_redeemed?: number
          updated_at?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bio: string | null
          city: string | null
          consultation_types: string[]
          country: string
          created_at: string
          credentials: string | null
          dea: string | null
          id: string
          is_active: boolean
          languages: string[]
          license_number: string | null
          license_states: string[]
          npi: string | null
          practice_states: string[]
          specialty: string | null
          state: string | null
          updated_at: string
          years_experience: number | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bio?: string | null
          city?: string | null
          consultation_types?: string[]
          country?: string
          created_at?: string
          credentials?: string | null
          dea?: string | null
          id: string
          is_active?: boolean
          languages?: string[]
          license_number?: string | null
          license_states?: string[]
          npi?: string | null
          practice_states?: string[]
          specialty?: string | null
          state?: string | null
          updated_at?: string
          years_experience?: number | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bio?: string | null
          city?: string | null
          consultation_types?: string[]
          country?: string
          created_at?: string
          credentials?: string | null
          dea?: string | null
          id?: string
          is_active?: boolean
          languages?: string[]
          license_number?: string | null
          license_states?: string[]
          npi?: string | null
          practice_states?: string[]
          specialty?: string | null
          state?: string | null
          updated_at?: string
          years_experience?: number | null
          zip?: string | null
        }
        Relationships: []
      }
      questionnaire_medicines: {
        Row: {
          created_at: string
          medicine_id: string
          questionnaire_id: string
        }
        Insert: {
          created_at?: string
          medicine_id: string
          questionnaire_id: string
        }
        Update: {
          created_at?: string
          medicine_id?: string
          questionnaire_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_medicines_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_medicines_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_question_options: {
        Row: {
          created_at: string
          id: string
          is_disqualifying: boolean
          label: string
          question_id: string
          sort_order: number
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_disqualifying?: boolean
          label: string
          question_id: string
          sort_order?: number
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_disqualifying?: boolean
          label?: string
          question_id?: string
          sort_order?: number
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_questions: {
        Row: {
          created_at: string
          description: string | null
          disqualify_rules: Json
          id: string
          is_required: boolean
          prompt: string
          question_type: Database["public"]["Enums"]["q_question_type"]
          questionnaire_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          disqualify_rules?: Json
          id?: string
          is_required?: boolean
          prompt: string
          question_type: Database["public"]["Enums"]["q_question_type"]
          questionnaire_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          disqualify_rules?: Json
          id?: string
          is_required?: boolean
          prompt?: string
          question_type?: Database["public"]["Enums"]["q_question_type"]
          questionnaire_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_note: string | null
          amount_cents: number
          created_at: string
          id: string
          payment_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stripe_refund_id: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          created_at?: string
          id?: string
          payment_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          created_at?: string
          id?: string
          payment_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_checkout_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shop_checkout_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_checkout_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_checkout_order_items: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          line_total: number
          medicine_id: string
          name: string
          order_id: string
          package_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          line_total: number
          medicine_id: string
          name: string
          order_id: string
          package_id?: string | null
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          line_total?: number
          medicine_id?: string
          name?: string
          order_id?: string
          package_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_checkout_order_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_checkout_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_checkout_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_checkout_order_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_checkout_orders: {
        Row: {
          created_at: string
          id: string
          medicine_id: string
          payment_method_code: string
          promo_code: string | null
          promo_savings: number
          selected_package_id: string | null
          selected_plan_code: string
          shipping: number
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          medicine_id: string
          payment_method_code: string
          promo_code?: string | null
          promo_savings?: number
          selected_package_id?: string | null
          selected_plan_code: string
          shipping?: number
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          medicine_id?: string
          payment_method_code?: string
          promo_code?: string | null
          promo_savings?: number
          selected_package_id?: string | null
          selected_plan_code?: string
          shipping?: number
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_checkout_orders_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_checkout_orders_selected_package_id_fkey"
            columns: ["selected_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          payload: Json
          received_at: string
          stripe_event_id: string
          type: string
        }
        Insert: {
          id?: string
          payload: Json
          received_at?: string
          stripe_event_id: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json
          received_at?: string
          stripe_event_id?: string
          type?: string
        }
        Relationships: []
      }
      subscription_cancellation_feedback: {
        Row: {
          created_at: string
          id: string
          other_text: string | null
          reasons: string[]
          stripe_subscription_id: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          other_text?: string | null
          reasons: string[]
          stripe_subscription_id: string
          subscription_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          other_text?: string | null
          reasons?: string[]
          stripe_subscription_id?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cancellation_feedback_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          medicine_id: string | null
          package_id: string | null
          session_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          medicine_id?: string | null
          package_id?: string | null
          session_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          medicine_id?: string | null
          package_id?: string | null
          session_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "intake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          id: string;
          referrer_user_id: string;
          referred_user_id: string | null;
          code: string;
          status: string;
          reward_cents: number;
          stripe_balance_txn_id: string | null;
          created_at: string;
          converted_at: string | null;
        };
        Insert: {
          id?: string;
          referrer_user_id: string;
          referred_user_id?: string | null;
          code: string;
          status?: string;
          reward_cents?: number;
          stripe_balance_txn_id?: string | null;
          created_at?: string;
          converted_at?: string | null;
        };
        Update: {
          id?: string;
          referrer_user_id?: string;
          referred_user_id?: string | null;
          code?: string;
          status?: string;
          reward_cents?: number;
          stripe_balance_txn_id?: string | null;
          created_at?: string;
          converted_at?: string | null;
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount_cents: number;
          type: string;
          description: string | null;
          referral_id: string | null;
          stripe_invoice_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_cents: number;
          type: string;
          description?: string | null;
          referral_id?: string | null;
          stripe_invoice_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_cents?: number;
          type?: string;
          description?: string | null;
          referral_id?: string | null;
          stripe_invoice_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      provider_directory: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          credentials: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          phone: string | null
          specialty: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_portal: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "patient"
      bmi_band: "underweight" | "normal" | "overweight" | "obese"
      eligibility_result: "eligible" | "ineligible" | "needs_review"
      intake_session_status:
        | "in_progress"
        | "payment_pending"
        | "completed"
        | "abandoned"
      medication_relationship: "incompatible" | "restricted"
      medicine_status: "active" | "inactive" | "draft"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      q_question_type:
        | "text"
        | "number"
        | "yes_no"
        | "single_choice"
        | "multi_choice"
      question_type: "short_text" | "mcq_single" | "mcq_multi"
      sex_type: "female" | "male" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "provider", "patient"],
      bmi_band: ["underweight", "normal", "overweight", "obese"],
      eligibility_result: ["eligible", "ineligible", "needs_review"],
      intake_session_status: [
        "in_progress",
        "payment_pending",
        "completed",
        "abandoned",
      ],
      medication_relationship: ["incompatible", "restricted"],
      medicine_status: ["active", "inactive", "draft"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      q_question_type: [
        "text",
        "number",
        "yes_no",
        "single_choice",
        "multi_choice",
      ],
      question_type: ["short_text", "mcq_single", "mcq_multi"],
      sex_type: ["female", "male", "other"],
    },
  },
} as const
