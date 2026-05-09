


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."shift_status" AS ENUM (
    'pending_approval',
    'approved',
    'disputed',
    'assigned',
    'in_progress',
    'completed',
    'alert',
    'cancelled'
);


ALTER TYPE "public"."shift_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'worker'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."care_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "shift_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "media_urls" "text"[] DEFAULT '{}'::"text"[],
    "signature_url" "text"
);


ALTER TABLE "public"."care_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "ndis_id" character varying(50),
    "emergency_contact" "text",
    "medical_alerts" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "avatar_url" "text"
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "role" "public"."user_role" DEFAULT 'worker'::"public"."user_role" NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "status" "public"."shift_status" DEFAULT 'pending_approval'::"public"."shift_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "clock_in_lat" numeric,
    "clock_in_lng" numeric,
    "clock_out_lat" numeric,
    "clock_out_lng" numeric
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agencies"
    ADD CONSTRAINT "agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."care_notes"
    ADD CONSTRAINT "care_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_care_notes_agency_active" ON "public"."care_notes" USING "btree" ("agency_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_participants_agency_active" ON "public"."participants" USING "btree" ("agency_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_profiles_agency_active" ON "public"."profiles" USING "btree" ("agency_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_shifts_agency_active" ON "public"."shifts" USING "btree" ("agency_id") WHERE ("deleted_at" IS NULL);



ALTER TABLE ONLY "public"."care_notes"
    ADD CONSTRAINT "care_notes_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."care_notes"
    ADD CONSTRAINT "care_notes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id");



ALTER TABLE ONLY "public"."care_notes"
    ADD CONSTRAINT "care_notes_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id");



ALTER TABLE ONLY "public"."care_notes"
    ADD CONSTRAINT "care_notes_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id");



ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Authenticated can view participants" ON "public"."participants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Tenants can only insert participants for their agency" ON "public"."participants" FOR INSERT WITH CHECK (("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid"));



CREATE POLICY "Tenants can only view their own active participants" ON "public"."participants" FOR SELECT USING ((("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can insert care notes for their agency" ON "public"."care_notes" FOR INSERT WITH CHECK (("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid"));



CREATE POLICY "Users can insert shifts for their agency" ON "public"."shifts" FOR INSERT WITH CHECK (("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid"));



CREATE POLICY "Users can update care notes in their agency" ON "public"."care_notes" FOR UPDATE USING (("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid"));



CREATE POLICY "Users can update profiles in their agency" ON "public"."profiles" FOR UPDATE USING (("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid"));



CREATE POLICY "Users can update shifts in their agency" ON "public"."shifts" FOR UPDATE USING (("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid"));



CREATE POLICY "Users can view care notes in their agency" ON "public"."care_notes" FOR SELECT USING ((("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view profiles in their agency" ON "public"."profiles" FOR SELECT USING ((("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view shifts in their agency" ON "public"."shifts" FOR SELECT USING ((("agency_id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view their own agency" ON "public"."agencies" FOR SELECT USING ((("id" = ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'agency_id'::"text"))::"uuid") AND ("deleted_at" IS NULL)));



CREATE POLICY "Worker can view own shifts" ON "public"."shifts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "worker_id"));



ALTER TABLE "public"."agencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."care_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."agencies" TO "anon";
GRANT ALL ON TABLE "public"."agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."agencies" TO "service_role";



GRANT ALL ON TABLE "public"."care_notes" TO "anon";
GRANT ALL ON TABLE "public"."care_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."care_notes" TO "service_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































