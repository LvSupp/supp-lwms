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
      articles: {
        Row: {
          actif: boolean
          created_at: string
          designation: string
          ean: string | null
          id: string
          reference: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          designation: string
          ean?: string | null
          id?: string
          reference: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          designation?: string
          ean?: string | null
          id?: string
          reference?: string
        }
        Relationships: []
      }
      emplacements: {
        Row: {
          actif: boolean
          capacite_max: number | null
          code: string
          created_at: string
          id: string
          site_id: string
          type_emplacement: string
        }
        Insert: {
          actif?: boolean
          capacite_max?: number | null
          code: string
          created_at?: string
          id?: string
          site_id: string
          type_emplacement?: string
        }
        Update: {
          actif?: boolean
          capacite_max?: number | null
          code?: string
          created_at?: string
          id?: string
          site_id?: string
          type_emplacement?: string
        }
        Relationships: [
          {
            foreignKeyName: "emplacements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      mouvements: {
        Row: {
          created_at: string
          destination_id: string | null
          id: string
          palette_id: string
          source_id: string | null
          type: string
          utilisateur_id: string | null
          utilisateur_nom: string | null
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          id?: string
          palette_id: string
          source_id?: string | null
          type: string
          utilisateur_id?: string | null
          utilisateur_nom?: string | null
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          id?: string
          palette_id?: string
          source_id?: string | null
          type?: string
          utilisateur_id?: string | null
          utilisateur_nom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "emplacements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_palette_id_fkey"
            columns: ["palette_id"]
            isOneToOne: false
            referencedRelation: "palettes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "emplacements"
            referencedColumns: ["id"]
          },
        ]
      }
      palettes: {
        Row: {
          article_id: string
          created_at: string
          created_by: string | null
          emplacement_id: string | null
          id: string
          lot: string | null
          numero: string
          quantite: number
          statut: string
        }
        Insert: {
          article_id: string
          created_at?: string
          created_by?: string | null
          emplacement_id?: string | null
          id?: string
          lot?: string | null
          numero: string
          quantite?: number
          statut?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          created_by?: string | null
          emplacement_id?: string | null
          id?: string
          lot?: string | null
          numero?: string
          quantite?: number
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "palettes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "palettes_emplacement_id_fkey"
            columns: ["emplacement_id"]
            isOneToOne: false
            referencedRelation: "emplacements"
            referencedColumns: ["id"]
          },
        ]
      }
      parametres_numerotation: {
        Row: {
          created_at: string
          id: boolean
          longueur: number
          prefixe: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: boolean
          longueur?: number
          prefixe?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: boolean
          longueur?: number
          prefixe?: string
          updated_at?: string
        }
        Relationships: []
      }
      profils: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nom?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      creer_palette: {
        Args: { p_article_id: string; p_lot: string; p_quantite: number }
        Returns: {
          article_id: string
          created_at: string
          created_by: string | null
          emplacement_id: string | null
          id: string
          lot: string | null
          numero: string
          quantite: number
          statut: string
        }
        SetofOptions: {
          from: "*"
          to: "palettes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deplacer_palette: {
        Args: { p_destination_id: string; p_palette_id: string }
        Returns: {
          article_id: string
          created_at: string
          created_by: string | null
          emplacement_id: string | null
          id: string
          lot: string | null
          numero: string
          quantite: number
          statut: string
        }
        SetofOptions: {
          from: "*"
          to: "palettes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      emplacement_reception: { Args: never; Returns: string }
      prochain_numero_palette: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
