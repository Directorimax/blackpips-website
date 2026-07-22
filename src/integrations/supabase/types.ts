export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bookmarks: {
        Row: {
          created_at: string;
          id: string;
          lesson_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lesson_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lesson_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          price: number;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          price: number;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          price?: number;
        };
        Relationships: [];
      };
      course_certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          certificate_number: string;
          issued_at: string;
          completion_percentage: number;
          pdf_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          certificate_number: string;
          issued_at?: string;
          completion_percentage?: number;
          pdf_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          certificate_number?: string;
          issued_at?: string;
          completion_percentage?: number;
          pdf_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_notifications: {
        Row: {
          id: string;
          event_type: string;
          resource_id: string;
          recipient_email: string;
          status: "processing" | "sent" | "failed";
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          resource_id: string;
          recipient_email: string;
          status?: "processing" | "sent" | "failed";
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          resource_id?: string;
          recipient_email?: string;
          status?: "processing" | "sent" | "failed";
          error_message?: string | null;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          slug: string;
          title: string;
          description: string | null;
          video_url: string | null;
          position: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          slug: string;
          title: string;
          description?: string | null;
          video_url?: string | null;
          position?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          video_url?: string | null;
          position?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          lesson_id: string;
          started_at: string;
          last_viewed_at: string;
          completed_at: string | null;
          is_completed: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          lesson_id: string;
          started_at?: string;
          last_viewed_at?: string;
          completed_at?: string | null;
          is_completed?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          lesson_id?: string;
          started_at?: string;
          last_viewed_at?: string;
          completed_at?: string | null;
          is_completed?: boolean;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          course_slug: string;
          created_at: string;
          id: string;
          progress: number;
          user_id: string;
        };
        Insert: {
          course_slug: string;
          created_at?: string;
          id?: string;
          progress?: number;
          user_id: string;
        };
        Update: {
          course_slug?: string;
          created_at?: string;
          id?: string;
          progress?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      mentorship_applications: {
        Row: {
          id: string;
          user_id: string;
          mentorship_package_id: string;
          full_name: string;
          email: string;
          whatsapp_number: string;
          country: string;
          experience_level: "beginner" | "intermediate" | "advanced";
          trading_duration: string;
          biggest_challenge: string;
          learning_goal: string;
          preferred_schedule: string;
          notes: string | null;
          status: "pending" | "approved" | "waitlisted" | "rejected";
          internal_admin_notes: string | null;
          learner_message: string | null;
          created_at: string;
          updated_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          mentorship_package_id: string;
          full_name: string;
          email: string;
          whatsapp_number: string;
          country: string;
          experience_level: "beginner" | "intermediate" | "advanced";
          trading_duration: string;
          biggest_challenge: string;
          learning_goal: string;
          preferred_schedule: string;
          notes?: string | null;
          status?: "pending" | "approved" | "waitlisted" | "rejected";
          internal_admin_notes?: string | null;
          learner_message?: string | null;
          created_at?: string;
          updated_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          mentorship_package_id?: string;
          full_name?: string;
          email?: string;
          whatsapp_number?: string;
          country?: string;
          experience_level?: "beginner" | "intermediate" | "advanced";
          trading_duration?: string;
          biggest_challenge?: string;
          learning_goal?: string;
          preferred_schedule?: string;
          notes?: string | null;
          status?: "pending" | "approved" | "waitlisted" | "rejected";
          internal_admin_notes?: string | null;
          learner_message?: string | null;
          created_at?: string;
          updated_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };
      mentorship_packages: {
        Row: {
          id: string;
          slug: string;
          name: string;
          short_description: string;
          price_display: string;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          short_description: string;
          price_display: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          short_description?: string;
          price_display?: string;
          is_active?: boolean;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          country: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          role: "student" | "admin";
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          role?: "student" | "admin";
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          role?: "student" | "admin";
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          amount: number;
          currency: string;
          payment_method: string | null;
          provider: string | null;
          transaction_id: string | null;
          provider_reference: string | null;
          proof_url: string | null;
          status: string;
          paid_at: string | null;
          created_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          amount: number;
          currency: string;
          payment_method?: string | null;
          provider?: string | null;
          transaction_id?: string | null;
          provider_reference?: string | null;
          proof_url?: string | null;
          status?: string;
          paid_at?: string | null;
          created_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          amount?: number;
          currency?: string;
          payment_method?: string | null;
          provider?: string | null;
          transaction_id?: string | null;
          provider_reference?: string | null;
          proof_url?: string | null;
          status?: string;
          paid_at?: string | null;
          created_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          amount: number;
          payment_status: string;
          transaction_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          amount: number;
          payment_status: string;
          transaction_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          amount?: number;
          payment_status?: string;
          transaction_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_list_course_certificates: {
        Args: { p_search?: string | null };
        Returns: {
          id: string;
          user_id: string;
          display_name: string;
          email: string;
          course_id: string;
          course_name: string;
          certificate_number: string;
          issued_at: string;
        }[];
      };
      admin_dashboard_overview: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_course_certificate: {
        Args: { p_certificate_id: string };
        Returns: Json;
      };
      my_course_certificates: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          course_id: string;
          course_name: string;
          certificate_number: string;
          issued_at: string;
          completion_percentage: number;
          pdf_generated: boolean;
        }[];
      };
      admin_list_lessons: {
        Args: { p_course_id: string };
        Returns: {
          id: string;
          course_id: string;
          title: string;
          slug: string;
          description: string | null;
          video_url: string | null;
          lesson_position: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        }[];
      };
      admin_list_students: {
        Args: {
          p_search?: string | null;
          p_course_id?: string | null;
          p_mentorship_status?: string | null;
          p_learning_state?: string | null;
          p_page?: number | null;
          p_page_size?: number | null;
        };
        Returns: {
          student_id: string;
          display_name: string | null;
          email: string | null;
          joined_at: string | null;
          courses_purchased: number;
          active_course_entitlements: number;
          completed_lessons: number;
          total_published_lessons: number;
          last_learning_activity: string | null;
          mentorship_status: string | null;
          total_count: number;
        }[];
      };
      admin_get_student_details: {
        Args: { p_student_id: string };
        Returns: Json;
      };
      admin_save_lesson: {
        Args: {
          p_lesson_id?: string | null;
          p_course_id?: string | null;
          p_title?: string | null;
          p_slug?: string | null;
          p_description?: string | null;
          p_video_url?: string | null;
          p_position?: number | null;
          p_is_published?: boolean;
        };
        Returns: { id: string; course_id: string; slug: string; lesson_position: number }[];
      };
      admin_move_lesson: {
        Args: { p_lesson_id: string; p_direction: string };
        Returns: { id: string; lesson_position: number }[];
      };
      admin_delete_lesson: {
        Args: { p_lesson_id: string };
        Returns: undefined;
      };
      admin_list_payments: {
        Args: { p_status?: string };
        Returns: {
          id: string;
          user_id: string;
          user_email: string | null;
          display_name: string | null;
          course_title: string;
          amount: number;
          currency: string;
          payment_method: string | null;
          provider: string | null;
          transaction_id: string | null;
          proof_url: string | null;
          status: string;
          rejection_reason: string | null;
          created_at: string | null;
        }[];
      };
      approve_payment: {
        Args: { p_payment_id: string };
        Returns: { id: string; status: string; created_at: string | null }[];
      };
      reject_payment: {
        Args: { p_payment_id: string; p_reason: string };
        Returns: { id: string; status: string; created_at: string | null }[];
      };
      admin_list_mentorship_applications: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string;
          email: string;
          whatsapp_number: string;
          country: string;
          package_name: string;
          experience_level: string;
          trading_duration: string;
          biggest_challenge: string;
          learning_goal: string;
          preferred_schedule: string;
          notes: string | null;
          status: string;
          internal_admin_notes: string | null;
          learner_message: string | null;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        }[];
      };
      review_mentorship_application: {
        Args: {
          p_application_id: string;
          p_status: string;
          p_internal_admin_notes?: string | null;
          p_learner_message?: string | null;
        };
        Returns: { id: string; status: string; reviewed_at: string | null }[];
      };
      submit_mentorship_application: {
        Args: {
          p_mentorship_package_id: string;
          p_full_name: string;
          p_email: string;
          p_whatsapp_number: string;
          p_country: string;
          p_experience_level: string;
          p_trading_duration: string;
          p_biggest_challenge: string;
          p_learning_goal: string;
          p_preferred_schedule: string;
          p_notes?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
