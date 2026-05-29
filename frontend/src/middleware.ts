// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // 1. Create a response object to pass down the chain
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Create the Supabase Edge client to read cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 3. Get the user session from Supabase
  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // --- ROUTING RULES ---

  // A. Protect Private Routes (Require Authentication)
  const isPrivateRoute = path.startsWith('/dashboard') || 
                         path.startsWith('/admin') || 
                         path.startsWith('/superadmin') ||
                         path.startsWith('/my-shifts') ||
                         path.startsWith('/participants') ||
                         path.startsWith('/settings');

  if (isPrivateRoute && !user) {
    // If not logged in and trying to access a private route, kick to login
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // B. Handle Logged-In Users Accessing Public Pages (Login/Root)
  if (user && (path === '/login' || path === '/')) {
    // Fetch the user's role to redirect them to their correct dashboard
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'worker';

    if (role === 'super_admin') {
      url.pathname = '/superadmin/dashboard';
    } else if (role === 'admin') {
      url.pathname = '/admin/dashboard';
    } else {
      url.pathname = '/dashboard';
    }
    
    return NextResponse.redirect(url);
  }

  // C. Role-Based Access Control (RBAC) Protections
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'worker';

    // Protect Super Admin Routes
    if (path.startsWith('/superadmin') && role !== 'super_admin') {
      url.pathname = role === 'admin' ? '/admin/dashboard' : '/dashboard';
      return NextResponse.redirect(url);
    }

    // Protect Admin Routes
    if (path.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
      url.pathname = '/dashboard'; // Kick workers out of admin
      return NextResponse.redirect(url);
    }
  }

  return response;
}

// 4. Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, public assets...
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};