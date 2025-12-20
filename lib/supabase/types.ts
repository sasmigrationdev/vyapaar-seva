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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          breaks: Json | null
          check_in_method: string | null
          check_in_time: string | null
          check_in_wifi_ssid: string | null
          check_in_wifi_verified: boolean | null
          check_out_time: string | null
          check_out_wifi_ssid: string | null
          check_out_wifi_verified: boolean | null
          created_at: string | null
          date: string
          id: string
          is_valid_day: boolean | null
          marked_by: string | null
          marked_by_role: string | null
          notes: string | null
          overtime_hours: number | null
          overtime_reason: string | null
          total_break_minutes: number | null
          total_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          breaks?: Json | null
          check_in_method?: string | null
          check_in_time?: string | null
          check_in_wifi_ssid?: string | null
          check_in_wifi_verified?: boolean | null
          check_out_time?: string | null
          check_out_wifi_ssid?: string | null
          check_out_wifi_verified?: boolean | null
          created_at?: string | null
          date: string
          id?: string
          is_valid_day?: boolean | null
          marked_by?: string | null
          marked_by_role?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_reason?: string | null
          total_break_minutes?: number | null
          total_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          breaks?: Json | null
          check_in_method?: string | null
          check_in_time?: string | null
          check_in_wifi_ssid?: string | null
          check_in_wifi_verified?: boolean | null
          check_out_time?: string | null
          check_out_wifi_ssid?: string | null
          check_out_wifi_verified?: boolean | null
          created_at?: string | null
          date?: string
          id?: string
          is_valid_day?: boolean | null
          marked_by?: string | null
          marked_by_role?: string | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_reason?: string | null
          total_break_minutes?: number | null
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      break_requests: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          approved_end_time: string | null
          approved_start_time: string | null
          attendance_record_id: string
          created_at: string | null
          duration_minutes: number | null
          end_wifi_ssid: string | null
          end_wifi_verified: boolean | null
          id: string
          is_active: boolean | null
          notes: string | null
          reason: string | null
          request_date: string
          requested_by: string
          requested_end_time: string | null
          requested_start_time: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          start_wifi_ssid: string | null
          start_wifi_verified: boolean | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          approved_end_time?: string | null
          approved_start_time?: string | null
          attendance_record_id: string
          created_at?: string | null
          duration_minutes?: number | null
          end_wifi_ssid?: string | null
          end_wifi_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          reason?: string | null
          request_date: string
          requested_by: string
          requested_end_time?: string | null
          requested_start_time?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          start_wifi_ssid?: string | null
          start_wifi_verified?: boolean | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          approved_end_time?: string | null
          approved_start_time?: string | null
          attendance_record_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          end_wifi_ssid?: string | null
          end_wifi_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          reason?: string | null
          request_date?: string
          requested_by?: string
          requested_end_time?: string | null
          requested_start_time?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          start_wifi_ssid?: string | null
          start_wifi_verified?: boolean | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "break_requests_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: false
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_payment_batches: {
        Row: {
          batch_name: string
          completed_at: string | null
          created_at: string | null
          error_log: Json | null
          failed_count: number | null
          id: string
          initiated_by: string
          notes: string | null
          payroll_period_id: string
          processed_count: number | null
          started_at: string | null
          status: string
          success_count: number | null
          total_amount: number
          total_employees: number
          updated_at: string | null
        }
        Insert: {
          batch_name: string
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          failed_count?: number | null
          id?: string
          initiated_by: string
          notes?: string | null
          payroll_period_id: string
          processed_count?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_amount: number
          total_employees: number
          updated_at?: string | null
        }
        Update: {
          batch_name?: string
          completed_at?: string | null
          created_at?: string | null
          error_log?: Json | null
          failed_count?: number | null
          id?: string
          initiated_by?: string
          notes?: string | null
          payroll_period_id?: string
          processed_count?: number | null
          started_at?: string | null
          status?: string
          success_count?: number | null
          total_amount?: number
          total_employees?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bulk_payment_batches_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_payment_batches_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_monthly_earnings: {
        Row: {
          created_at: string | null
          earned_salary: number | null
          expected_hours: number | null
          id: string
          month: number
          total_hours_worked: number | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          earned_salary?: number | null
          expected_hours?: number | null
          id?: string
          month: number
          total_hours_worked?: number | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          earned_salary?: number | null
          expected_hours?: number | null
          id?: string
          month?: number
          total_hours_worked?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_monthly_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_employee_history: {
        Row: {
          approved_by: string | null
          created_at: string | null
          employee_id: string
          id: string
          join_method: string
          joined_at: string
          leave_reason: string | null
          left_at: string | null
          notes: string | null
          organization_id: string
          terminated_by: string | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          join_method: string
          joined_at: string
          leave_reason?: string | null
          left_at?: string | null
          notes?: string | null
          organization_id: string
          terminated_by?: string | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          join_method?: string
          joined_at?: string
          leave_reason?: string | null
          left_at?: string | null
          notes?: string | null
          organization_id?: string
          terminated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_employee_history_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_employee_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_employee_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_employee_history_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_employee_requests: {
        Row: {
          created_at: string | null
          employee_id: string
          employer_id: string | null
          id: string
          message: string | null
          organization_id: string
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          employer_id?: string | null
          id?: string
          message?: string | null
          organization_id: string
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          employer_id?: string | null
          id?: string
          message?: string | null
          organization_id?: string
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_employee_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_employee_requests_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_employee_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_employee_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          organization_id: string
          payment_method: string | null
          reference_number: string | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          reference_number?: string | null
          transaction_date?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          reference_number?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          start_date: string
          status: string
          total_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          start_date: string
          status?: string
          total_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          start_date?: string
          status?: string
          total_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      office_wifi_networks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          organization_id: string
          ssid: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          ssid: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          ssid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_wifi_networks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_wifi_networks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          employer_code: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          employer_code?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          employer_code?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      overtime_requests: {
        Row: {
          approved_hours: number | null
          attendance_record_id: string
          created_at: string | null
          id: string
          reason: string | null
          request_date: string
          requested_hours: number
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_hours?: number | null
          attendance_record_id: string
          created_at?: string | null
          id?: string
          reason?: string | null
          request_date: string
          requested_hours: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_hours?: number | null
          attendance_record_id?: string
          created_at?: string | null
          id?: string
          reason?: string | null
          request_date?: string
          requested_hours?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "overtime_requests_attendance_record_id_fkey"
            columns: ["attendance_record_id"]
            isOneToOne: true
            referencedRelation: "attendance_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overtime_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          account_number: string | null
          amount: number
          bank_name: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          payment_method: string
          payroll_period_id: string
          processed_by: string | null
          reference_number: string | null
          salary_record_id: string
          status: string
          transaction_date: string | null
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          amount: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method: string
          payroll_period_id: string
          processed_by?: string | null
          reference_number?: string | null
          salary_record_id: string
          status?: string
          transaction_date?: string | null
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string
          payroll_period_id?: string
          processed_by?: string | null
          reference_number?: string | null
          salary_record_id?: string
          status?: string
          transaction_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_salary_record_id_fkey"
            columns: ["salary_record_id"]
            isOneToOne: false
            referencedRelation: "salary_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          employees_paid: number | null
          end_date: string
          id: string
          initiated_at: string | null
          initiated_by: string | null
          metadata: Json | null
          month: number
          notes: string | null
          organization_id: string
          start_date: string
          status: string
          total_amount_paid: number | null
          total_deductions: number | null
          total_employees: number | null
          total_gross_salary: number | null
          total_net_salary: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          employees_paid?: number | null
          end_date: string
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          metadata?: Json | null
          month: number
          notes?: string | null
          organization_id: string
          start_date: string
          status?: string
          total_amount_paid?: number | null
          total_deductions?: number | null
          total_employees?: number | null
          total_gross_salary?: number | null
          total_net_salary?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          employees_paid?: number | null
          end_date?: string
          id?: string
          initiated_at?: string | null
          initiated_by?: string | null
          metadata?: Json | null
          month?: number
          notes?: string | null
          organization_id?: string
          start_date?: string
          status?: string
          total_amount_paid?: number | null
          total_deductions?: number | null
          total_employees?: number | null
          total_gross_salary?: number | null
          total_net_salary?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          effective_from: string
          id: string
          new_daily_working_hours: number | null
          new_hourly_rate: number | null
          new_salary: number
          new_working_days: string[] | null
          notes: string | null
          old_daily_working_hours: number | null
          old_hourly_rate: number | null
          old_salary: number | null
          old_working_days: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          effective_from: string
          id?: string
          new_daily_working_hours?: number | null
          new_hourly_rate?: number | null
          new_salary: number
          new_working_days?: string[] | null
          notes?: string | null
          old_daily_working_hours?: number | null
          old_hourly_rate?: number | null
          old_salary?: number | null
          old_working_days?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          effective_from?: string
          id?: string
          new_daily_working_hours?: number | null
          new_hourly_rate?: number | null
          new_salary?: number
          new_working_days?: string[] | null
          notes?: string | null
          old_daily_working_hours?: number | null
          old_hourly_rate?: number | null
          old_salary?: number | null
          old_working_days?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_records: {
        Row: {
          allowances: number | null
          approved_by: string | null
          base_salary: number
          bonus: number | null
          created_at: string | null
          created_by: string | null
          deductions: number | null
          expected_hours: number | null
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          leaves_taken: number | null
          month: number
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          payment_mode: string | null
          payment_notes: string | null
          payment_reference: string | null
          payment_status: string | null
          payroll_period_id: string | null
          present_days: number
          status: string
          total_salary: number | null
          updated_at: string | null
          user_id: string
          working_days: number
          year: number
        }
        Insert: {
          allowances?: number | null
          approved_by?: string | null
          base_salary: number
          bonus?: number | null
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          expected_hours?: number | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          leaves_taken?: number | null
          month: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_mode?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payroll_period_id?: string | null
          present_days: number
          status?: string
          total_salary?: number | null
          updated_at?: string | null
          user_id: string
          working_days: number
          year: number
        }
        Update: {
          allowances?: number | null
          approved_by?: string | null
          base_salary?: number
          bonus?: number | null
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          expected_hours?: number | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          leaves_taken?: number | null
          month?: number
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_mode?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          payroll_period_id?: string | null
          present_days?: number
          status?: string
          total_salary?: number | null
          updated_at?: string | null
          user_id?: string
          working_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_cache: {
        Row: {
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          aadhaar_number: string | null
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          base_salary: number | null
          branch_name: string | null
          created_at: string | null
          daily_working_hours: number | null
          date_of_birth: string | null
          date_of_joining: string | null
          department: string | null
          designation: string | null
          email: string
          employee_id: string | null
          expo_push_token: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          is_employer: boolean | null
          monthly_total_hours: number | null
          organization_id: string | null
          phone: string | null
          profile_picture_url: string | null
          role: string
          updated_at: string | null
          wifi_verification_required: boolean | null
          working_days: string[] | null
        }
        Insert: {
          aadhaar_number?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          base_salary?: number | null
          branch_name?: string | null
          created_at?: string | null
          daily_working_hours?: number | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email: string
          employee_id?: string | null
          expo_push_token?: string | null
          full_name: string
          hourly_rate?: number | null
          id: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_employer?: boolean | null
          monthly_total_hours?: number | null
          organization_id?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          role: string
          updated_at?: string | null
          wifi_verification_required?: boolean | null
          working_days?: string[] | null
        }
        Update: {
          aadhaar_number?: string | null
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          base_salary?: number | null
          branch_name?: string | null
          created_at?: string | null
          daily_working_hours?: number | null
          date_of_birth?: string | null
          date_of_joining?: string | null
          department?: string | null
          designation?: string | null
          email?: string
          employee_id?: string | null
          expo_push_token?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_employer?: boolean | null
          monthly_total_hours?: number | null
          organization_id?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          role?: string
          updated_at?: string | null
          wifi_verification_required?: boolean | null
          working_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_pending_salary_changes: { Args: never; Returns: Json }
      calculate_working_days_in_month: {
        Args: {
          target_month: number
          target_year: number
          working_days: string[]
        }
        Returns: number
      }
      can_check_out: { Args: { p_user_id: string }; Returns: boolean }
      can_start_break: {
        Args: { p_date: string; p_user_id: string }
        Returns: boolean
      }
      create_employee_profile: {
        Args: {
          p_auth_user_id: string
          p_date_of_joining?: string
          p_department?: string
          p_designation?: string
          p_email: string
          p_employee_id: string
          p_full_name: string
          p_organization_id?: string
          p_phone?: string
          p_role?: string
        }
        Returns: Json
      }
      create_employee_with_auth: {
        Args: {
          p_date_of_joining?: string
          p_department?: string
          p_designation?: string
          p_email: string
          p_employee_id: string
          p_full_name: string
          p_organization_id?: string
          p_password: string
          p_phone?: string
          p_role?: string
        }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      delete_employee_with_cascade: {
        Args: { p_employee_id: string }
        Returns: Json
      }
      generate_employee_id: { Args: { org_id: string }; Returns: string }
      generate_employer_code: { Args: never; Returns: string }
      get_monthly_attendance_summary: {
        Args: { p_month: number; p_user_id: string; p_year: number }
        Returns: {
          avg_hours: number
          present_days: number
          total_days: number
          total_hours: number
        }[]
      }
      get_my_organization_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_user_sessions: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          id: string
          ip: unknown
          refreshed_at: string
          updated_at: string
          user_agent: string
          user_id: string
        }[]
      }
      is_hr_or_admin: { Args: never; Returns: boolean }
      leave_organization: {
        Args: { p_employee_id: string; p_reason: string }
        Returns: Json
      }
      register_employer: {
        Args: {
          p_auth_user_id: string
          p_email: string
          p_full_name: string
          p_organization_name: string
        }
        Returns: Json
      }
      request_join_organization: {
        Args: {
          p_employee_id: string
          p_message: string
          p_organization_id: string
        }
        Returns: Json
      }
      review_join_request: {
        Args: {
          p_notes: string
          p_request_id: string
          p_reviewer_id: string
          p_status: string
        }
        Returns: Json
      }
      search_employers:
        | {
            Args: { p_limit?: number; p_search_query: string }
            Returns: {
              employer_code: string
              employer_email: string
              employer_id: string
              employer_name: string
              organization_id: string
              organization_name: string
            }[]
          }
        | {
            Args: {
              p_employee_id?: string
              p_limit?: number
              p_search_query: string
            }
            Returns: {
              employer_code: string
              employer_email: string
              employer_id: string
              employer_name: string
              organization_id: string
              organization_name: string
            }[]
          }
      update_employee_salary: {
        Args: {
          p_change_reason?: string
          p_changed_by: string
          p_effective_from?: string
          p_new_base_salary: number
          p_new_daily_hours: number
          p_new_working_days: string[]
          p_notes?: string
          p_user_id: string
        }
        Returns: Json
      }
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
    Enums: {},
  },
} as const
