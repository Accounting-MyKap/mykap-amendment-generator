import { supabase } from './supabaseClient';
import { Template, MergeField } from '../types';

// --- Templates ---

export const fetchTemplates = async (): Promise<Template[]> => {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching templates:', error);
        return [];
    }

    return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        title: t.title,
        body: t.body,
        signatureLeft: t.signature_left,
        signatureRight: t.signature_right,
        allowedMergeFieldIds: t.allowed_merge_field_ids || []
    }));
};

export const saveTemplate = async (template: Template) => {
    // Check if exists to update or insert
    const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('id', template.id)
        .single();

    const payload = {
        id: template.id,
        name: template.name,
        title: template.title,
        body: template.body,
        signature_left: template.signatureLeft,
        signature_right: template.signatureRight,
        allowed_merge_field_ids: template.allowedMergeFieldIds || [],
        updated_at: new Date().toISOString()
    };

    if (existing) {
        const { error } = await supabase
            .from('templates')
            .update(payload)
            .eq('id', template.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('templates')
            .insert(payload);
        if (error) throw error;
    }
};

export const deleteTemplate = async (id: string) => {
    const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// --- Merge Fields ---

export const fetchMergeFields = async (): Promise<MergeField[]> => {
    const { data, error } = await supabase
        .from('merge_fields')
        .select('*');

    if (error) {
        console.error('Error fetching merge fields:', error);
        return [];
    }
    return data;
};

export const saveMergeField = async (field: MergeField) => {
    const { error } = await supabase
        .from('merge_fields')
        .insert(field);
    if (error) throw error;
};

export const deleteMergeField = async (id: string) => {
    const { error } = await supabase
        .from('merge_fields')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// --- Letterhead (Storage) ---

export const uploadLetterhead = async (file: File): Promise<string | null> => {
    const fileName = `letterhead-${Date.now()}`;

    console.log('[uploadLetterhead] Starting upload:', fileName);

    const { data, error } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

    if (error) {
        console.error('[uploadLetterhead] Storage upload error:', error);
        alert(`Error subiendo el archivo: ${error.message}`);
        return null;
    }

    console.log('[uploadLetterhead] Upload successful:', data);

    const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

    console.log('[uploadLetterhead] Public URL:', publicUrl);

    // Save URL to app_settings table
    const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert({ key: 'letterhead_url', value: publicUrl });

    if (upsertError) {
        console.error('[uploadLetterhead] Error saving to app_settings:', upsertError);
        alert(`Error guardando la URL: ${upsertError.message}`);
        return null;
    }

    console.log('[uploadLetterhead] Successfully saved to app_settings');
    return publicUrl;
};

export const fetchLetterheadUrl = async (): Promise<string | null> => {
    console.log('[fetchLetterheadUrl] Fetching letterhead URL...');

    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'letterhead_url')
        .single();

    if (error) {
        console.error('[fetchLetterheadUrl] Error:', error);
        return null;
    }

    if (!data) {
        console.log('[fetchLetterheadUrl] No letterhead found');
        return null;
    }

    console.log('[fetchLetterheadUrl] Letterhead URL:', data.value);
    return data.value;
};
