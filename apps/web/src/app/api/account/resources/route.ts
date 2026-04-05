import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { apiError, handleApiError, ERR } from '@/lib/errors';

/**
 * GET /api/account/resources
 *
 * Returns a summary of resources that would be deleted if the user deletes their account.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiError(ERR.UNAUTHORIZED, 401);
    }

    const userId = session.userId;
    const supabase: any = createClient();

    // Get VM info from assistants table
    let vm = null;
    const { data: assistant } = await supabase
      .from('assistants')
      .select('vm_name, vm_region, vm_ip, vm_size')
      .eq('user_id', userId)
      .in('status', ['active', 'suspended', 'provisioning'])
      .limit(1)
      .single();

    if (assistant?.vm_name) {
      vm = {
        name: assistant.vm_name,
        region: assistant.vm_region ?? null,
        ip: assistant.vm_ip ?? null,
        size: assistant.vm_size ?? null,
      };
    }

    // Get telegram bot username from users table
    let telegramBot = null;
    const { data: user } = await supabase
      .from('users')
      .select('bot_username')
      .eq('id', userId)
      .single();

    if (user?.bot_username) {
      telegramBot = { username: user.bot_username };
    }

    // Database tables are always present for any user
    const database = {
      tables: ['user profile', 'assistant config', 'credentials', 'subscription'],
    };

    return NextResponse.json({
      resources: {
        vm,
        telegramBot,
        database,
      },
    });
  } catch (err) {
    return handleApiError(err, 'account-resources');
  }
}
