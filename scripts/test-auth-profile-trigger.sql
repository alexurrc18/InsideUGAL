DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    profile_count integer;
BEGIN
    RAISE NOTICE 'Testing auth.users trigger with id %', test_user_id;

    INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
    VALUES (
        test_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'trigger.test@ugal.ro',
        crypt('ParolaTemporara123!', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"first_name":"Trigger","last_name":"Test","username":"trigger_test"}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

    SELECT COUNT(*)
    INTO profile_count
    FROM public.profiles
    WHERE id = test_user_id
      AND email = 'trigger.test@ugal.ro';

    IF profile_count <> 1 THEN
        RAISE EXCEPTION 'Trigger did not create public.profiles row for auth user %', test_user_id;
    END IF;

    RAISE NOTICE 'OK: trigger created public.profiles row for %', test_user_id;

    DELETE FROM auth.users WHERE id = test_user_id;
    DELETE FROM public.profiles WHERE id = test_user_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Auth profile trigger test failed. SQLSTATE %, error: %', SQLSTATE, SQLERRM;
END $$;
