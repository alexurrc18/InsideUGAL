-- 1. Tabelul USERS
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indeși pentru Users
CREATE INDEX idx_users_email_active ON public.users (email, is_active);
CREATE INDEX idx_users_id ON public.users (id);
CREATE INDEX idx_users_email ON public.users (email);

-- 2. Tabelul FACULTIES
CREATE TABLE public.faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    abbreviation VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index pentru Faculties
CREATE INDEX idx_faculties_id ON public.faculties (id);

-- 3. Tabelul STUDENTS
CREATE TABLE public.students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    year INTEGER,
    student_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indeși pentru Students
CREATE INDEX idx_students_faculty_year ON public.students (faculty_id, year);
CREATE INDEX idx_students_id ON public.students (id);

-- 4. Tabelul PROFESSORS
CREATE TABLE public.professors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    faculty_id INTEGER REFERENCES public.faculties(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indeși pentru Professors
CREATE INDEX idx_professors_faculty ON public.professors (faculty_id);
CREATE INDEX idx_professors_id ON public.professors (id);

-- 5. Tabelul COURSES
CREATE TABLE public.courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    faculty_id INTEGER NOT NULL REFERENCES public.faculties(id) ON DELETE CASCADE,
    professor_id INTEGER REFERENCES public.professors(id) ON DELETE SET NULL,
    credits INTEGER DEFAULT 3,
    semester INTEGER,
    year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index pentru Courses
CREATE INDEX idx_courses_id ON public.courses (id);

-- 6. Tabelul ANNOUNCEMENTS
CREATE TABLE public.announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indeși pentru Announcements
CREATE INDEX idx_announcements_created ON public.announcements (created_at);
CREATE INDEX idx_announcements_pinned ON public.announcements (is_pinned);
CREATE INDEX idx_announcements_id ON public.announcements (id);

-- 7. Tabelul ENROLLMENTS
CREATE TABLE public.enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    grade VARCHAR(50),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indeși pentru Enrollments
CREATE UNIQUE INDEX idx_enrollments_unique ON public.enrollments (student_id, course_id);
CREATE INDEX idx_enrollments_id ON public.enrollments (id);

-- 8. Automatizare pentru câmpul `updated_at` (Specific PostgreSQL)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggere pentru fiecare tabel ca updated_at să se schimbe singur la modificări
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_faculties_modtime BEFORE UPDATE ON public.faculties FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_students_modtime BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_professors_modtime BEFORE UPDATE ON public.professors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_announcements_modtime BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_enrollments_modtime BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();