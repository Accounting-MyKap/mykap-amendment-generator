import { supabase } from './services/supabaseClient';

async function debug() {
    console.log('Checking app_settings table...');

    // Try to insert/upsert a test value
    const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert({ key: 'test_key', value: 'test_value' });

    if (upsertError) {
        console.error('Upsert Error:', upsertError);
    } else {
        console.log('Upsert successful');
    }

    // Try to read it back
    const { data, error: selectError } = await supabase
        .from('app_settings')
        .select('*');

    if (selectError) {
        console.error('Select Error:', selectError);
    } else {
        console.log('Select Data:', data);
    }
}

debug();
