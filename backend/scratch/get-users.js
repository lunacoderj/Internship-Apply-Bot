import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error.message);
    return;
  }
  if (users.length === 0) {
    console.log('No users found in Supabase.');
  } else {
    console.log('Found users:');
    users.forEach(u => console.log(`- ${u.email}: ${u.id}`));
  }
}

getUsers();
