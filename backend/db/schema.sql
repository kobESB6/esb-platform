--
-- PostgreSQL database dump
--


-- Dumped from database version 16.11 (Homebrew)
-- Dumped by pg_dump version 16.11 (Homebrew)

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

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'athlete',
    'coach',
    'legend'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: athlete_sports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_sports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" uuid NOT NULL,
    sport character varying(255) NOT NULL,
    "position" character varying(255),
    stats jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: football_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.football_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "athleteSportId" uuid NOT NULL,
    "fortyTime" numeric(4,2),
    "shuttleTime" numeric(4,2),
    "verticalInches" numeric(3,1),
    "benchMaxLbs" integer,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: soccer_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.soccer_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "athleteSportId" uuid NOT NULL,
    goals integer,
    assists integer,
    saves integer,
    "cleanSheets" integer,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: softball_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.softball_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "athleteSportId" uuid NOT NULL,
    "battingAvg" numeric(4,3),
    "homeToFirst" numeric(4,2),
    "pitchSpeedMph" integer,
    era numeric(4,2),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: track_marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.track_marks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "athleteSportId" uuid NOT NULL,
    event character varying(255) NOT NULL,
    mark numeric(7,2) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role public.enum_users_role NOT NULL,
    tier character varying(255) DEFAULT 'basic'::character varying,
    "isVerified" boolean DEFAULT false,
    "profilePhoto" character varying(255),
    "primarySport" character varying(255),
    "sportsPlayed" character varying(255)[] DEFAULT (ARRAY[]::character varying[])::character varying(255)[],
    "position" character varying(255),
    school character varying(255),
    "graduationYear" integer,
    gpa numeric(3,2),
    "coachType" character varying(255),
    "onTheField" jsonb DEFAULT '{}'::jsonb,
    "inTheClassroom" jsonb DEFAULT '{}'::jsonb,
    "offTheField" jsonb DEFAULT '{}'::jsonb,
    recruiting jsonb DEFAULT '{}'::jsonb,
    mentorship jsonb DEFAULT '{}'::jsonb,
    "linkedProfiles" jsonb DEFAULT '[]'::jsonb,
    progression jsonb DEFAULT '{}'::jsonb,
    wishlist jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "resetToken" character varying(255),
    "resetTokenExpiry" timestamp with time zone,
    "heightInches" integer,
    "weightLbs" integer,
    "recruitingStatus" character varying(255)
);


--
-- Name: athlete_sports athlete_sports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_sports
    ADD CONSTRAINT athlete_sports_pkey PRIMARY KEY (id);


--
-- Name: athlete_sports athlete_sports_user_sport_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_sports
    ADD CONSTRAINT athlete_sports_user_sport_unique UNIQUE ("userId", sport);


--
-- Name: football_stats football_stats_athleteSportId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.football_stats
    ADD CONSTRAINT "football_stats_athleteSportId_key" UNIQUE ("athleteSportId");


--
-- Name: football_stats football_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.football_stats
    ADD CONSTRAINT football_stats_pkey PRIMARY KEY (id);


--
-- Name: soccer_stats soccer_stats_athleteSportId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soccer_stats
    ADD CONSTRAINT "soccer_stats_athleteSportId_key" UNIQUE ("athleteSportId");


--
-- Name: soccer_stats soccer_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soccer_stats
    ADD CONSTRAINT soccer_stats_pkey PRIMARY KEY (id);


--
-- Name: softball_stats softball_stats_athleteSportId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.softball_stats
    ADD CONSTRAINT "softball_stats_athleteSportId_key" UNIQUE ("athleteSportId");


--
-- Name: softball_stats softball_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.softball_stats
    ADD CONSTRAINT softball_stats_pkey PRIMARY KEY (id);


--
-- Name: track_marks track_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_marks
    ADD CONSTRAINT track_marks_pkey PRIMARY KEY (id);


--
-- Name: track_marks track_marks_sport_event_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_marks
    ADD CONSTRAINT track_marks_sport_event_unique UNIQUE ("athleteSportId", event);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: athlete_sports_sport_position_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX athlete_sports_sport_position_idx ON public.athlete_sports USING btree (sport, "position");


--
-- Name: football_stats_benchMaxLbs_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "football_stats_benchMaxLbs_idx" ON public.football_stats USING btree ("benchMaxLbs");


--
-- Name: football_stats_fortyTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "football_stats_fortyTime_idx" ON public.football_stats USING btree ("fortyTime");


--
-- Name: football_stats_shuttleTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "football_stats_shuttleTime_idx" ON public.football_stats USING btree ("shuttleTime");


--
-- Name: football_stats_verticalInches_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "football_stats_verticalInches_idx" ON public.football_stats USING btree ("verticalInches");


--
-- Name: soccer_stats_assists_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX soccer_stats_assists_idx ON public.soccer_stats USING btree (assists);


--
-- Name: soccer_stats_cleanSheets_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "soccer_stats_cleanSheets_idx" ON public.soccer_stats USING btree ("cleanSheets");


--
-- Name: soccer_stats_goals_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX soccer_stats_goals_idx ON public.soccer_stats USING btree (goals);


--
-- Name: soccer_stats_saves_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX soccer_stats_saves_idx ON public.soccer_stats USING btree (saves);


--
-- Name: softball_stats_battingAvg_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "softball_stats_battingAvg_idx" ON public.softball_stats USING btree ("battingAvg");


--
-- Name: softball_stats_era_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX softball_stats_era_idx ON public.softball_stats USING btree (era);


--
-- Name: softball_stats_homeToFirst_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "softball_stats_homeToFirst_idx" ON public.softball_stats USING btree ("homeToFirst");


--
-- Name: softball_stats_pitchSpeedMph_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "softball_stats_pitchSpeedMph_idx" ON public.softball_stats USING btree ("pitchSpeedMph");


--
-- Name: track_marks_event_mark_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX track_marks_event_mark_idx ON public.track_marks USING btree (event, mark);


--
-- Name: users_coach_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_coach_type ON public.users USING btree ("coachType");


--
-- Name: users_graduation_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_graduation_year ON public.users USING btree ("graduationYear");


--
-- Name: users_heightInches_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_heightInches_idx" ON public.users USING btree ("heightInches");


--
-- Name: users_primary_sport; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_primary_sport ON public.users USING btree ("primarySport");


--
-- Name: users_recruitingStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_recruitingStatus_idx" ON public.users USING btree ("recruitingStatus");


--
-- Name: users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_role ON public.users USING btree (role);


--
-- Name: users_sports_played; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sports_played ON public.users USING gin ("sportsPlayed");


--
-- Name: users_weightLbs_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_weightLbs_idx" ON public.users USING btree ("weightLbs");


--
-- Name: athlete_sports athlete_sports_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_sports
    ADD CONSTRAINT "athlete_sports_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: football_stats football_stats_athleteSportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.football_stats
    ADD CONSTRAINT "football_stats_athleteSportId_fkey" FOREIGN KEY ("athleteSportId") REFERENCES public.athlete_sports(id) ON DELETE CASCADE;


--
-- Name: soccer_stats soccer_stats_athleteSportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.soccer_stats
    ADD CONSTRAINT "soccer_stats_athleteSportId_fkey" FOREIGN KEY ("athleteSportId") REFERENCES public.athlete_sports(id) ON DELETE CASCADE;


--
-- Name: softball_stats softball_stats_athleteSportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.softball_stats
    ADD CONSTRAINT "softball_stats_athleteSportId_fkey" FOREIGN KEY ("athleteSportId") REFERENCES public.athlete_sports(id) ON DELETE CASCADE;


--
-- Name: track_marks track_marks_athleteSportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.track_marks
    ADD CONSTRAINT "track_marks_athleteSportId_fkey" FOREIGN KEY ("athleteSportId") REFERENCES public.athlete_sports(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


